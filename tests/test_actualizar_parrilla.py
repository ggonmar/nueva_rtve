import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from actualizar_parrilla import generate


class GenerarParrillaTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "programas").mkdir()
        (self.root / "readme.md").write_text(
            "Introducción\n"
            "<!-- programas-confirmados:inicio -->\nTabla antigua\n<!-- programas-confirmados:fin -->\n"
            "Texto manual\n"
            "<!-- programas-candidatos:inicio -->\nTabla antigua\n<!-- programas-candidatos:fin -->\n"
            "Final\n",
            encoding="utf-8",
        )

    def ficha(self, filename, title, status="Confirmado", description="Descripción"):
        path = self.root / "programas" / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            f"- **Título:** {title}\n- **Tipo:** Humor\n"
            f"- **Estado:** {status}\n- **Descripción:** {description}\n",
            encoding="utf-8",
        )
        return path

    def test_genera_todas_las_fichas_y_respeta_las_secciones_manuales(self):
        self.ficha("zeta.md", "Zeta")
        self.ficha("sub carpeta/a.md", "A [prueba]", "Candidato", "Uno | dos")
        self.assertFalse(generate(self.root, check=True))
        self.assertIn("Tabla antigua", (self.root / "readme.md").read_text(encoding="utf-8"))
        self.assertTrue(generate(self.root))
        content = (self.root / "readme.md").read_text(encoding="utf-8")
        self.assertIn("| [Zeta](programas/zeta.md) | Humor | Por concretar | Descripción |", content)
        self.assertIn(r"| [A \[prueba\]](programas/sub%20carpeta/a.md) | Humor | Por concretar | Uno \| dos |", content)
        self.assertIn("Texto manual", content)
        self.assertTrue(generate(self.root, check=True))
        self.assertTrue(generate(self.root))
        self.assertEqual(content, (self.root / "readme.md").read_text(encoding="utf-8"))

    def test_cambiar_estado_mueve_la_fila_y_eliminar_ficha_la_quita(self):
        path = self.ficha("a.md", "Programa")
        generate(self.root)
        self.ficha("a.md", "Programa", "Candidato")
        generate(self.root)
        content = (self.root / "readme.md").read_text(encoding="utf-8")
        confirmed, candidates = content.split("<!-- programas-candidatos:inicio -->")
        self.assertNotIn("[Programa]", confirmed)
        self.assertIn("[Programa]", candidates)
        path.unlink()
        generate(self.root)
        self.assertNotIn("[Programa]", (self.root / "readme.md").read_text(encoding="utf-8"))
        (self.root / "programas").rmdir()
        self.assertTrue(generate(self.root, check=True))

    def test_incluye_presentador_en_confirmados_y_candidatos(self):
        for filename, status in (("a.md", "Confirmado"), ("b.md", "Candidato")):
            path = self.ficha(filename, filename, status)
            with path.open("a", encoding="utf-8") as file:
                file.write("- **Presentador:** Ana | Luis\n")
        generate(self.root)
        content = (self.root / "readme.md").read_text(encoding="utf-8")
        self.assertEqual(content.count("| Tipo | Presentador | Descripción |"), 2)
        self.assertEqual(content.count(r"| Humor | Ana \| Luis | Descripción |"), 2)

    def test_actualiza_el_readme_sin_modificar_la_parrilla_antigua(self):
        legacy = self.root / "parrilla.md"
        legacy.write_text("Enlace al README\n", encoding="utf-8")
        self.ficha("a.md", "Programa")
        generate(self.root)
        self.assertIn("[Programa]", (self.root / "readme.md").read_text(encoding="utf-8"))
        self.assertEqual("Enlace al README\n", legacy.read_text(encoding="utf-8"))

    def test_datos_invalidos_no_modifican_la_parrilla(self):
        original = (self.root / "readme.md").read_text(encoding="utf-8")
        path = self.ficha("a.md", "Programa", "Pendiente")
        with self.assertRaisesRegex(ValueError, "estado desconocido"):
            generate(self.root)
        path.write_text("- **Título:** Programa\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "faltan campos"):
            generate(self.root)
        path.write_text(
            "- **Título:** Uno\n- **Titulo:** Dos\n- **Tipo:** Humor\n"
            "- **Estado:** Confirmado\n- **Descripción:** Texto\n",
            encoding="utf-8",
        )
        with self.assertRaisesRegex(ValueError, "campo duplicado"):
            generate(self.root)
        self.assertEqual(original, (self.root / "readme.md").read_text(encoding="utf-8"))

    def test_rechaza_titulos_duplicados_y_marcadores_invalidos(self):
        self.ficha("a.md", "Mismo")
        self.ficha("b.md", "mismo", "Candidato")
        with self.assertRaisesRegex(ValueError, "Título duplicado"):
            generate(self.root)
        (self.root / "programas" / "b.md").unlink()
        grid = self.root / "readme.md"
        original = grid.read_text(encoding="utf-8").replace("<!-- programas-candidatos:fin -->", "")
        grid.write_text(original, encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "marcadores"):
            generate(self.root)
        self.assertEqual(original, grid.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
