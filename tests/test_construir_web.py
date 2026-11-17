import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from construir_web import build, markdown_to_html


README = """# Parrilla

<!-- manifiesto:inicio -->
## Declaración de intenciones

Texto del **manifiesto**.
<!-- manifiesto:fin -->

## Contenido

Más _texto_.

<!-- personas-confirmados:inicio -->
| Nombre | Perfil de programa | Notas |
| --- | --- | --- |
| Alaska | Presentadora | Asignada a \\| todo. |
<!-- personas-confirmados:fin -->
<!-- personas-candidatos:inicio -->
| Nombre | Perfil de programa | Notas |
| --- | --- | --- |
<!-- personas-candidatos:fin -->
"""


class MarkdownTest(unittest.TestCase):
    def test_escapa_html_y_descarta_enlaces_peligrosos(self):
        result = markdown_to_html(
            "## Título <b>\n\nUn **negrita** y `<code>` con [malo](javascript:alert) y [bueno](https://x.es)\n"
            "- uno\n  sigue\n- _dos_\n"
        )
        self.assertEqual(
            result,
            "<h3>Título &lt;b&gt;</h3>"
            "<p>Un <strong>negrita</strong> y <code>&lt;code&gt;</code> con malo y "
            '<a href="https://x.es" target="_blank" rel="noopener noreferrer">bueno</a></p>'
            "<ul><li>uno sigue</li><li><em>dos</em></li></ul>",
        )


class ConstruirWebTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "programas").mkdir()
        (self.root / "web").mkdir()
        (self.root / "web" / "index.html").write_text("<html></html>", encoding="utf-8")
        (self.root / "readme.md").write_text(README, encoding="utf-8")

    def ficha(self, filename, title, status="Confirmado", schedule="16:00-18:00", extra=""):
        (self.root / "programas" / filename).write_text(
            f"# {title}\n\n- **Título:** {title}\n- **Tipo:** Humor\n- **Estado:** {status}\n"
            f"- **Horario:** {schedule}\n- **Descripción:** Algo\n{extra}",
            encoding="utf-8",
        )

    def test_genera_paginas_datos_e_imagenes(self):
        self.ficha("tarde.md", "Tarde", schedule="18:00-19:00")
        self.ficha("la cena.md", "La Cena", schedule="09:00-10:00",
                   extra="- **Slogan:** *Hola*\n\n## Secciones\nVer [la tarde](tarde.md).\n\n# Notas\nNo publicar.\n")
        self.ficha("idea.md", "Idea", status="Candidato", schedule="01:00-02:00")
        (self.root / "imagenes" / "programas").mkdir(parents=True)
        (self.root / "imagenes" / "programas" / "la-cena.png").write_bytes(b"png")
        output = self.root / "_site"

        data = build(self.root, output, "owner/repo")

        programs = {item["slug"]: item for item in data["programas"]}
        self.assertEqual([item["slug"] for item in data["programas"]], ["la-cena", "tarde", "idea"])
        self.assertEqual([item["pagina"] for item in data["programas"]], [301, 302, 303])
        self.assertEqual(programs["la-cena"]["extras"], [{"campo": "Slogan", "valor": "<em>Hola</em>"}])
        self.assertEqual(programs["la-cena"]["cuerpo"], '<h3>Secciones</h3><p>Ver <a href="#/tarde">la tarde</a>.</p>')
        self.assertEqual(programs["la-cena"]["imagen"], "imagenes/programas/la-cena.png")
        self.assertIsNone(programs["tarde"]["imagen"])
        self.assertIn("<strong>manifiesto</strong>", data["manifiesto"])
        self.assertNotIn("<em>texto</em>", data["manifiesto"])
        self.assertEqual(data["personas"]["confirmados"][0]["notas"], "Asignada a | todo.")
        self.assertEqual((output / "imagenes" / "programas" / "la-cena.png").read_bytes(), b"png")
        self.assertTrue((output / "index.html").exists())
        script = (output / "datos.js").read_text(encoding="utf-8")
        self.assertEqual(json.loads(script.removeprefix("window.TELETEXTO = ").rstrip().rstrip(";")), data)

        self.ficha("nueva.md", "Nueva", schedule="20:00-21:00")
        build(self.root, output)
        self.assertIn('"slug": "nueva"', (output / "datos.js").read_text(encoding="utf-8"))

    def test_no_borra_carpetas_que_no_ha_generado(self):
        self.ficha("tarde.md", "Tarde")
        output = self.root / "otra"
        output.mkdir()
        (output / "importante.txt").write_text("no tocar", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "no se borra"):
            build(self.root, output)
        self.assertTrue((output / "importante.txt").exists())

    def noticia(self, filename, date="2026-11-10", extra=""):
        folder = self.root / "noticias"
        folder.mkdir(exist_ok=True)
        (folder / filename).write_text(
            f"# Titular\n\n- **Titular:** Titular {filename}\n- **Sección:** Nacional\n"
            f"- **Fecha:** {date}\n- **Entradilla:** Una *entradilla*\n{extra}",
            encoding="utf-8",
        )

    def test_genera_noticias_ordenadas_por_fecha(self):
        self.ficha("tarde.md", "Tarde")
        self.noticia("vieja.md", "2026-01-01")
        self.noticia("nueva.md", "2026-11-17", "\nTexto con [enlace](../programas/tarde.md).\n\n## Notas\nFuente interna.\n")

        data = build(self.root, self.root / "_site")

        self.assertEqual([(n["slug"], n["pagina"]) for n in data["noticias"]], [("nueva", 111), ("vieja", 112)])
        self.assertEqual(data["noticias"][0]["entradilla"], "Una <em>entradilla</em>")
        self.assertEqual(data["noticias"][0]["cuerpo"], '<p>Texto con <a href="#/tarde">enlace</a>.</p>')

    def test_rechaza_noticias_incompletas_o_con_fecha_invalida(self):
        self.ficha("tarde.md", "Tarde")
        self.noticia("mala.md", "17/11/2026")
        with self.assertRaisesRegex(ValueError, "fecha inválida"):
            build(self.root, self.root / "_site")
        (self.root / "noticias" / "mala.md").write_text("- **Titular:** Solo titular\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "faltan campos: Sección, Fecha, Entradilla"):
            build(self.root, self.root / "_site")

    def test_rechaza_fichas_con_la_misma_direccion(self):
        self.ficha("la cena.md", "La Cena")
        self.ficha("la-cena.md", "Otra Cena")
        with self.assertRaisesRegex(ValueError, "misma dirección"):
            build(self.root, self.root / "_site")


if __name__ == "__main__":
    unittest.main()
