from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "sprint-3-etapa-5-manual-acceptance-usability-review.md"
OUTPUT = ROOT / "sprint-3-etapa-5-manual-acceptance-usability-review.pdf"
IMAGE_PATTERN = re.compile(r"^!\[(?P<alt>.*)\]\((?P<path>.*)\)$")


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="BodyCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            alignment=TA_LEFT,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TitleCustom",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#1f2937"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Heading2Custom",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#111827"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Heading3Custom",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            leftIndent=12,
            bulletIndent=0,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CaptionCustom",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4b5563"),
            spaceAfter=8,
        )
    )
    return styles


def escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def render_image(path_text: str, alt_text: str):
    image_path = Path(path_text)

    if not image_path.exists():
      return []

    reader = ImageReader(str(image_path))
    width, height = reader.getSize()
    max_width = A4[0] - 36 * mm
    max_height = 150 * mm
    scale = min(max_width / width, max_height / height, 1)
    image = Image(str(image_path), width=width * scale, height=height * scale)
    image.hAlign = "LEFT"

    story = [image]

    if alt_text:
        story.append(Paragraph(escape(alt_text), build_styles()["CaptionCustom"]))

    story.append(Spacer(1, 6))
    return story


def render_markdown(md_text: str):
    styles = build_styles()
    story = []

    for raw_line in md_text.splitlines():
        line = raw_line.rstrip()

        if not line:
            story.append(Spacer(1, 4))
            continue

        image_match = IMAGE_PATTERN.match(line)
        if image_match:
            story.extend(
                render_image(
                    image_match.group("path"),
                    image_match.group("alt"),
                )
            )
            continue

        if line.startswith("# "):
            story.append(Paragraph(escape(line[2:]), styles["TitleCustom"]))
            continue

        if line.startswith("## "):
            story.append(Paragraph(escape(line[3:]), styles["Heading2Custom"]))
            continue

        if line.startswith("### "):
            story.append(Paragraph(escape(line[4:]), styles["Heading3Custom"]))
            continue

        if line.startswith("- "):
            story.append(
                Paragraph(
                    escape(line[2:]),
                    styles["BulletCustom"],
                    bulletText="-",
                )
            )
            continue

        story.append(Paragraph(escape(line), styles["BodyCustom"]))

    return story


def main():
    content = SOURCE.read_text(encoding="utf-8")
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="REVORY Sprint 3 Etapa 5 Manual Acceptance and Usability Review",
        author="Codex",
    )
    doc.build(render_markdown(content))
    print(OUTPUT)


if __name__ == "__main__":
    main()
