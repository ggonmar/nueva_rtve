#!/usr/bin/env python3
"""Genera las tablas de programas y de rostros del README a partir de sus fichas Markdown."""

import argparse
import posixpath
import re
import sys
from pathlib import Path
from urllib.parse import quote, unquote


ROOT = Path(__file__).resolve().parent.parent
FIELD_PATTERN = re.compile(r"^\s*-\s+\*\*(Título|Titulo|Tipo|Estado|Horario|Presentador|Descripción):\*\*\s*(.*?)\s*$")
REQUIRED_FIELDS = ("Título", "Tipo", "Estado", "Horario", "Descripción")
SCHEDULE_PATTERN = re.compile(r"([01][0-9]|2[0-3]):([0-5][0-9])-([01][0-9]|2[0-3]):([0-5][0-9])")
MARKERS = {
    "Confirmado": ("<!-- programas-confirmados:inicio -->", "<!-- programas-confirmados:fin -->"),
    "Candidato": ("<!-- programas-candidatos:inicio -->", "<!-- programas-candidatos:fin -->"),
}
PERSON_FIELD_PATTERN = re.compile(r"^\s*-\s+\*\*(Nombre|Perfil|Estado|Programas|Descripción):\*\*\s*(.*?)\s*$")
PERSON_REQUIRED_FIELDS = ("Nombre", "Perfil", "Estado", "Descripción")
PERSON_MARKERS = {
    "Confirmado": ("<!-- personas-confirmados:inicio -->", "<!-- personas-confirmados:fin -->"),
    "Candidato": ("<!-- personas-candidatos:inicio -->", "<!-- personas-candidatos:fin -->"),
}
LINK_PATTERN = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
NOTES_PATTERN = re.compile(r"(?mi)^#{1,6}[ \t]+Notas[ \t]*$")


def read_program(path, root):
    fields = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = FIELD_PATTERN.match(line)
        if not match:
            continue
        name, value = match.groups()
        name = "Título" if name == "Titulo" else name
        if name in fields:
            raise ValueError(f"{path}: campo duplicado: {name}")
        if not value:
            raise ValueError(f"{path}: campo vacío: {name}")
        fields[name] = value

    missing = [name for name in REQUIRED_FIELDS if name not in fields]
    if missing:
        raise ValueError(f"{path}: faltan campos: {', '.join(missing)}")
    if fields["Estado"] not in MARKERS:
        raise ValueError(f"{path}: estado desconocido: {fields['Estado']}")
    schedule = SCHEDULE_PATTERN.fullmatch(fields["Horario"])
    if not schedule or schedule.group(1, 2) == schedule.group(3, 4):
        raise ValueError(f"{path}: horario inválido: {fields['Horario']}; usa HH:MM-HH:MM con horas distintas")
    fields["ruta"] = path.relative_to(root).as_posix()
    return fields


def strip_notes(text):
    """Quita el apartado de notas internas (un título «Notas» y todo lo que le sigue)."""
    match = NOTES_PATTERN.search(text)
    return text[:match.start()] if match else text


def read_person(path, root, program_paths):
    """Lee la ficha de un rostro; «Programas» debe enlazar a fichas existentes de la carpeta programas."""
    fields = {}
    for line in strip_notes(path.read_text(encoding="utf-8")).splitlines():
        match = PERSON_FIELD_PATTERN.match(line)
        if not match:
            continue
        name, value = match.groups()
        if name in fields:
            raise ValueError(f"{path}: campo duplicado: {name}")
        if not value:
            raise ValueError(f"{path}: campo vacío: {name}")
        fields[name] = value

    missing = [name for name in PERSON_REQUIRED_FIELDS if name not in fields]
    if missing:
        raise ValueError(f"{path}: faltan campos: {', '.join(missing)}")
    if fields["Estado"] not in PERSON_MARKERS:
        raise ValueError(f"{path}: estado desconocido: {fields['Estado']}")
    route = path.relative_to(root).as_posix()
    programs = []
    if "Programas" in fields:
        links = LINK_PATTERN.findall(fields["Programas"])
        if not links:
            raise ValueError(f"{path}: el campo Programas debe enlazar a las fichas, por ejemplo [Título](../programas/ficha.md)")
        for _, url in links:
            target = posixpath.normpath(posixpath.join(posixpath.dirname(route), unquote(url.split("#")[0])))
            if target not in program_paths:
                raise ValueError(f"{path}: el programa enlazado no existe: {url}")
            if target not in programs:
                programs.append(target)
    fields["programas"] = programs
    fields["ruta"] = route
    return fields


def read_people(root, program_paths):
    folder = root / "rostros"
    if folder.exists() and not folder.is_dir():
        raise ValueError(f"La ruta de rostros no es una carpeta: {folder}")
    people, names = [], {}
    for path in sorted(folder.rglob("*.md")) if folder.is_dir() else []:
        person = read_person(path, root, program_paths)
        key = person["Nombre"].casefold()
        if key in names:
            raise ValueError(f"Nombre duplicado en {names[key]} y {path}: {person['Nombre']}")
        names[key] = path
        people.append(person)
    order = {"Confirmado": 0, "Candidato": 1}
    people.sort(key=lambda item: (order[item["Estado"]], item["Nombre"].casefold()))
    return people


def escape_link_text(value):
    return escape_cell(value.replace("\\", "\\\\").replace("[", r"\[").replace("]", r"\]"))


def render_people_table(people, program_titles):
    rows = ["| Nombre | Perfil | Programas | Descripción |", "| --- | --- | --- | --- |"]
    for person in people:
        name = f"[{escape_link_text(person['Nombre'])}]({quote(person['ruta'], safe='/')})"
        programs = ", ".join(
            f"[{escape_link_text(program_titles[route])}]({quote(route, safe='/')})" for route in person["programas"]
        ) or "Por concretar"
        rows.append(f"| {name} | {escape_cell(person['Perfil'])} | {programs} | {escape_cell(person['Descripción'])} |")
    return "\n".join(rows)


def replace_between(text, start, end, content, label):
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"Se necesita exactamente una pareja de marcadores para {label}")
    start_index = text.index(start) + len(start)
    end_index = text.index(end)
    if end_index < start_index:
        raise ValueError(f"Marcadores fuera de orden para {label}")
    return text[:start_index] + "\n" + content + "\n" + text[end_index:]


def escape_cell(value):
    return value.replace("|", r"\|")


def render_table(programs):
    rows = ["| Horario | Nombre | Tipo | Presentador | Descripción |", "| --- | --- | --- | --- | --- |"]
    for program in sorted(programs, key=lambda item: (item["Horario"][:5], item["Título"].casefold())):
        title = program["Título"].replace("\\", "\\\\").replace("[", r"\[").replace("]", r"\]")
        title = escape_cell(title)
        url = quote(program["ruta"], safe="/")
        kind = escape_cell(program["Tipo"])
        presenter = escape_cell(program.get("Presentador", "Por concretar"))
        description = escape_cell(program["Descripción"])
        rows.append(f"| {program['Horario']} | [{title}]({url}) | {kind} | {presenter} | {description} |")
    return "\n".join(rows)


def generate(root, check=False):
    programs_dir = root / "programas"
    if programs_dir.exists() and not programs_dir.is_dir():
        raise ValueError(f"La ruta de programas no es una carpeta: {programs_dir}")
    files = sorted(programs_dir.rglob("*.md"))

    groups = {status: [] for status in MARKERS}
    titles, program_titles = {}, {}
    for path in files:
        program = read_program(path, root)
        key = program["Título"].casefold()
        if key in titles:
            raise ValueError(f"Título duplicado en {titles[key]} y {path}: {program['Título']}")
        titles[key] = path
        program_titles[program["ruta"]] = program["Título"]
        groups[program["Estado"]].append(program)

    grid_path = root / "readme.md"
    original = grid_path.read_text(encoding="utf-8")
    updated = original
    for status, (start, end) in MARKERS.items():
        updated = replace_between(updated, start, end, render_table(groups[status]), f"los programas ({status})")

    if (root / "rostros").is_dir():
        people = read_people(root, program_titles)
        for status, (start, end) in PERSON_MARKERS.items():
            group = [person for person in people if person["Estado"] == status]
            updated = replace_between(updated, start, end, render_people_table(group, program_titles), f"los rostros ({status})")

    if updated != original:
        if check:
            return False
        grid_path.write_text(updated, encoding="utf-8", newline="\n")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Comprueba la parrilla sin modificarla")
    args = parser.parse_args()
    try:
        current = generate(ROOT, check=args.check)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    if not current:
        print("La parrilla no está actualizada. Ejecuta python scripts/actualizar_parrilla.py.", file=sys.stderr)
        return 1
    print("Parrilla actualizada." if not args.check else "La parrilla esta actualizada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
