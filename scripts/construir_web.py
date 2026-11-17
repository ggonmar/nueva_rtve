#!/usr/bin/env python3
"""Construye la web estilo teletexto a partir de las fichas de programas y del README."""

import argparse
import html
import json
import os
import posixpath
import re
import shutil
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from actualizar_parrilla import FIELD_PATTERN, read_program  # noqa: E402


ROOT = Path(__file__).resolve().parent.parent
FIRST_PROGRAM_PAGE = 301
LAST_PROGRAM_PAGE = 399
FIRST_NEWS_PAGE = 111
LAST_NEWS_PAGE = 198
NEWS_FIELDS = ("Titular", "Sección", "Fecha", "Entradilla")
DATE_PATTERN = re.compile(r"\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])")
IMAGE_DIR = Path("imagenes") / "programas"
IMAGE_EXTENSIONS = (".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg")
MANIFESTO_MARKERS = ("<!-- manifiesto:inicio -->", "<!-- manifiesto:fin -->")
PEOPLE_MARKERS = {
    "confirmados": ("<!-- personas-confirmados:inicio -->", "<!-- personas-confirmados:fin -->"),
    "candidatos": ("<!-- personas-candidatos:inicio -->", "<!-- personas-candidatos:fin -->"),
}
BUILD_MARKER = ".nojekyll"

EXTRA_FIELD_PATTERN = re.compile(r"^\s*-\s+\*\*([^*]+?):\*\*\s*(.*?)\s*$")
NOTES_PATTERN = re.compile(r"(?mi)^#{1,6}[ \t]+Notas[ \t]*$")
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.*)$")
ITEM_PATTERN = re.compile(r"^[-*+]\s+(.*)$")
LINK_PATTERN = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
BOLD_PATTERN = re.compile(r"\*\*(.+?)\*\*")
ITALIC_PATTERN = re.compile(r"(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)")
SAFE_SCHEMES = ("http://", "https://", "mailto:")


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "programa"


def _emphasis(escaped):
    escaped = BOLD_PATTERN.sub(r"<strong>\1</strong>", escaped)
    return ITALIC_PATTERN.sub(lambda m: f"<em>{m.group(1) or m.group(2)}</em>", escaped)


def _format_text(text, link):
    parts = []
    position = 0
    for match in LINK_PATTERN.finditer(text):
        parts.append(_emphasis(html.escape(text[position:match.start()], quote=False)))
        label = _emphasis(html.escape(match.group(1), quote=False))
        href = link(match.group(2)) if link else match.group(2)
        if href and (href.startswith(SAFE_SCHEMES) or href.startswith("#")):
            external = "" if href.startswith("#") else ' target="_blank" rel="noopener noreferrer"'
            parts.append(f'<a href="{html.escape(href)}"{external}>{label}</a>')
        else:
            parts.append(label)
        position = match.end()
    parts.append(_emphasis(html.escape(text[position:], quote=False)))
    return "".join(parts)


def render_inline(text, link=None):
    rendered = []
    for part in re.split(r"(`[^`]+`)", text):
        if len(part) > 1 and part.startswith("`") and part.endswith("`"):
            rendered.append(f"<code>{html.escape(part[1:-1], quote=False)}</code>")
        elif part:
            rendered.append(_format_text(part, link))
    return "".join(rendered)


def markdown_to_html(text, link=None):
    """Convierte el subconjunto de Markdown usado en las fichas: títulos, listas, párrafos y formato en línea."""
    blocks, paragraph, items = [], [], []

    def flush_paragraph():
        if paragraph:
            blocks.append(f"<p>{render_inline(' '.join(paragraph), link)}</p>")
            paragraph.clear()

    def flush_items():
        if items:
            blocks.append("<ul>" + "".join(f"<li>{render_inline(item, link)}</li>" for item in items) + "</ul>")
            items.clear()

    for raw in text.splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("<"):
            flush_paragraph()
            flush_items()
            continue
        heading = HEADING_PATTERN.match(stripped)
        if heading:
            flush_paragraph()
            flush_items()
            level = min(len(heading.group(1)) + 1, 6)
            blocks.append(f"<h{level}>{render_inline(heading.group(2), link)}</h{level}>")
            continue
        item = ITEM_PATTERN.match(stripped)
        if item:
            flush_paragraph()
            items.append(item.group(1))
            continue
        if items and raw[:1] in (" ", "\t"):
            items[-1] += " " + stripped
            continue
        flush_items()
        paragraph.append(stripped)
    flush_paragraph()
    flush_items()
    return "".join(blocks)


def strip_notes(text):
    """Quita el apartado de notas internas (un título «Notas» y todo lo que le sigue)."""
    match = NOTES_PATTERN.search(text)
    return text[:match.start()] if match else text


def split_program(text):
    """Separa la cabecera de la ficha (campos) del resto del contenido."""
    extras, body = [], []
    in_header = True
    for line in text.splitlines():
        if in_header:
            stripped = line.strip()
            if not stripped or re.match(r"#\s", stripped) or FIELD_PATTERN.match(line):
                continue
            extra = EXTRA_FIELD_PATTERN.match(line)
            if extra:
                extras.append(extra.groups())
                continue
            in_header = False
        body.append(line)
    return extras, "\n".join(body)


def make_linker(source, slugs, repository, branch):
    """Traduce enlaces relativos: fichas a páginas internas y el resto a GitHub."""
    def link(url):
        if url.startswith(SAFE_SCHEMES) or url.startswith("#"):
            return url
        target = posixpath.normpath(posixpath.join(posixpath.dirname(source), url.split("#")[0]))
        target = target.replace("%20", " ")
        if target in slugs:
            return f"#/{slugs[target]}"
        if repository and not target.startswith(".."):
            return f"https://github.com/{repository}/blob/{branch}/{target}"
        return None
    return link


def between_markers(text, start, end):
    if text.count(start) != 1 or text.count(end) != 1 or text.index(end) < text.index(start):
        raise ValueError(f"Se necesita exactamente una pareja de marcadores {start} / {end} en el README")
    return text[text.index(start) + len(start):text.index(end)]


def read_table(text, start, end):
    block = between_markers(text, start, end)
    rows = [line.strip() for line in block.splitlines() if line.strip().startswith("|")]
    result = []
    for row in rows[2:]:
        cells = [cell.strip().replace(r"\|", "|") for cell in re.split(r"(?<!\\)\|", row.strip("|"))]
        if len(cells) != 3:
            raise ValueError(f"Fila de personas con columnas inesperadas: {row}")
        result.append(cells)
    return result


def find_image(root, slug):
    for extension in IMAGE_EXTENSIONS:
        candidate = root / IMAGE_DIR / f"{slug}{extension}"
        if candidate.is_file():
            return candidate
    return None


def read_news(root, slugs, repository, branch):
    news = []
    for path in sorted((root / "noticias").rglob("*.md")):
        source = path.relative_to(root).as_posix()
        fields, body, in_header = {}, [], True
        for line in strip_notes(path.read_text(encoding="utf-8")).splitlines():
            field = EXTRA_FIELD_PATTERN.match(line) if in_header else None
            if field:
                name, value = field.groups()
                if name in fields:
                    raise ValueError(f"{path}: campo duplicado: {name}")
                fields[name] = value
                continue
            if in_header and (not line.strip() or re.match(r"#\s", line.strip())):
                continue
            in_header = False
            body.append(line)
        missing = [name for name in NEWS_FIELDS if not fields.get(name)]
        if missing:
            raise ValueError(f"{path}: faltan campos: {', '.join(missing)}")
        if not DATE_PATTERN.fullmatch(fields["Fecha"]):
            raise ValueError(f"{path}: fecha inválida: {fields['Fecha']}; usa AAAA-MM-DD")
        link = make_linker(source, slugs, repository, branch)
        news.append({
            "slug": slugify(path.stem),
            "titular": fields["Titular"],
            "seccion": fields["Sección"],
            "fecha": fields["Fecha"],
            "firma": fields.get("Firma"),
            "entradilla": render_inline(fields["Entradilla"], link),
            "cuerpo": markdown_to_html("\n".join(body), link),
            "fuente": source,
        })

    seen = set()
    for item in news:
        if item["slug"] in seen:
            raise ValueError(f"Dos noticias generan la misma dirección web «{item['slug']}»")
        seen.add(item["slug"])
    news.sort(key=lambda item: item["slug"])
    news.sort(key=lambda item: item["fecha"], reverse=True)
    if FIRST_NEWS_PAGE + len(news) - 1 > LAST_NEWS_PAGE:
        raise ValueError(f"Hay demasiadas noticias para las páginas {FIRST_NEWS_PAGE}-{LAST_NEWS_PAGE}")
    for page, item in enumerate(news, FIRST_NEWS_PAGE):
        item["pagina"] = page
    return news


def collect(root, repository=None, branch="main"):
    files = sorted((root / "programas").rglob("*.md"))
    programs, slugs, titles = [], {}, {}
    for path in files:
        program = read_program(path, root)
        key = program["Título"].casefold()
        if key in titles:
            raise ValueError(f"Título duplicado en {titles[key]} y {path}: {program['Título']}")
        titles[key] = path
        slug = slugify(path.stem)
        if slug in slugs.values():
            raise ValueError(f"Dos fichas generan la misma dirección web «{slug}»: renombra {path}")
        slugs[program["ruta"]] = slug
        program["slug"] = slug
        program["texto"] = strip_notes(path.read_text(encoding="utf-8"))
        programs.append(program)

    order = {"Confirmado": 0, "Candidato": 1}
    programs.sort(key=lambda item: (order[item["Estado"]], item["Horario"][:5], item["Título"].casefold()))
    if FIRST_PROGRAM_PAGE + len(programs) - 1 > LAST_PROGRAM_PAGE:
        raise ValueError("Hay demasiados programas para las páginas 301-399")

    data = []
    for page, program in enumerate(programs, FIRST_PROGRAM_PAGE):
        link = make_linker(program["ruta"], slugs, repository, branch)
        extras, body = split_program(program["texto"])
        image = find_image(root, program["slug"])
        data.append({
            "slug": program["slug"],
            "pagina": page,
            "titulo": program["Título"],
            "tipo": program["Tipo"],
            "estado": program["Estado"],
            "horario": program["Horario"],
            "presentador": program.get("Presentador"),
            "descripcion": render_inline(program["Descripción"], link),
            "extras": [{"campo": name, "valor": render_inline(value, link)} for name, value in extras],
            "cuerpo": markdown_to_html(body, link),
            "imagen": image.relative_to(root).as_posix() if image else None,
            "imagenSugerida": (IMAGE_DIR / f"{program['slug']}.jpg").as_posix(),
            "fuente": program["ruta"],
        })

    readme = (root / "readme.md").read_text(encoding="utf-8")
    readme_link = make_linker("readme.md", slugs, repository, branch)
    people = {
        group: [
            {"nombre": name, "perfil": profile, "notas": render_inline(notes, readme_link)}
            for name, profile, notes in read_table(readme, start, end)
        ]
        for group, (start, end) in PEOPLE_MARKERS.items()
    }
    return {
        "repositorio": repository,
        "rama": branch,
        "manifiesto": markdown_to_html(between_markers(readme, *MANIFESTO_MARKERS), readme_link),
        "programas": data,
        "noticias": read_news(root, slugs, repository, branch),
        "personas": people,
    }


def build(root, output, repository=None, branch="main"):
    data = collect(root, repository, branch)
    if output.exists():
        if not output.is_dir():
            raise ValueError(f"La salida no es una carpeta: {output}")
        if any(output.iterdir()) and not (output / BUILD_MARKER).exists():
            raise ValueError(f"La carpeta {output} no está vacía y no parece una web generada; no se borra")
        shutil.rmtree(output)
    shutil.copytree(root / "web", output)
    (output / BUILD_MARKER).write_text("", encoding="utf-8")
    script = "window.TELETEXTO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
    (output / "datos.js").write_text(script, encoding="utf-8", newline="\n")
    for program in data["programas"]:
        if program["imagen"]:
            target = output / program["imagen"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / program["imagen"], target)
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", type=Path, default=ROOT / "_site", help="Carpeta de salida (por defecto, _site)")
    parser.add_argument(
        "--repositorio",
        default=os.environ.get("GITHUB_REPOSITORY"),
        help="Repositorio owner/nombre para enlazar las fichas en GitHub",
    )
    parser.add_argument("--rama", default=os.environ.get("GITHUB_REF_NAME") or "main", help="Rama de los enlaces")
    args = parser.parse_args()
    try:
        data = build(ROOT, args.salida.resolve(), args.repositorio, args.rama)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    print(f"Web generada en {args.salida} con {len(data['programas'])} programas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
