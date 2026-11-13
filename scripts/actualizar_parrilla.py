#!/usr/bin/env python3
"""Genera las tablas de programas a partir de sus fichas Markdown."""

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent.parent
FIELD_PATTERN = re.compile(r"^\s*-\s+\*\*(Título|Titulo|Tipo|Estado|Horario|Presentador|Descripción):\*\*\s*(.*?)\s*$")
REQUIRED_FIELDS = ("Título", "Tipo", "Estado", "Horario", "Descripción")
SCHEDULE_PATTERN = re.compile(r"([01][0-9]|2[0-3]):([0-5][0-9])-([01][0-9]|2[0-3]):([0-5][0-9])")
MARKERS = {
    "Confirmado": ("<!-- programas-confirmados:inicio -->", "<!-- programas-confirmados:fin -->"),
    "Candidato": ("<!-- programas-candidatos:inicio -->", "<!-- programas-candidatos:fin -->"),
}


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
    titles = {}
    for path in files:
        program = read_program(path, root)
        key = program["Título"].casefold()
        if key in titles:
            raise ValueError(f"Título duplicado en {titles[key]} y {path}: {program['Título']}")
        titles[key] = path
        groups[program["Estado"]].append(program)

    grid_path = root / "readme.md"
    original = grid_path.read_text(encoding="utf-8")
    updated = original
    for status, (start, end) in MARKERS.items():
        if updated.count(start) != 1 or updated.count(end) != 1:
            raise ValueError(f"Se necesita exactamente una pareja de marcadores para {status}")
        start_index = updated.index(start) + len(start)
        end_index = updated.index(end)
        if end_index < start_index:
            raise ValueError(f"Marcadores fuera de orden para {status}")
        updated = updated[:start_index] + "\n" + render_table(groups[status]) + "\n" + updated[end_index:]

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
