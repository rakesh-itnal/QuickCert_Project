from __future__ import annotations

from pathlib import Path
from typing import Any

from reportlab.lib.colors import Color, green, red
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


PAGE_WIDTH, PAGE_HEIGHT = A4


def normalized_bbox_to_a4_points(bbox: list[int]) -> tuple[float, float, float, float]:
    """
    Convert a top-left-origin normalized bbox (0-1000 scale) into ReportLab points.

    Input format:
    [ymin, xmin, ymax, xmax]

    Output format:
    (x, y, width, height)

    ReportLab uses a bottom-left origin, so the Y axis must be inverted.
    """

    ymin, xmin, ymax, xmax = bbox
    x = (xmin / 1000.0) * PAGE_WIDTH
    top = (ymin / 1000.0) * PAGE_HEIGHT
    bottom = (ymax / 1000.0) * PAGE_HEIGHT
    width = ((xmax - xmin) / 1000.0) * PAGE_WIDTH
    height = ((ymax - ymin) / 1000.0) * PAGE_HEIGHT
    y = PAGE_HEIGHT - bottom
    return x, y, width, height


def resolve_field_value(field: dict[str, Any], record: dict[str, Any]) -> str:
    manual_text = str(field.get("manual_text") or "").strip()
    if manual_text:
        return manual_text

    mapping_column = field.get("mapping_column")
    if mapping_column:
        val = str(record.get(mapping_column, "")).strip()
        if val:
            return val

    return f"[{field.get('label', 'Unmapped')}]"


def fit_font_size(text: str, width: float, height: float, font_name: str = "Helvetica") -> float:
    """
    Shrink text until it fits inside the target region.
    """

    if not text:
        return max(8.0, min(height * 0.45, 14.0))

    max_size = max(8.0, min(height * 0.65, 24.0))
    size = max_size
    usable_width = max(width - 6.0, 10.0)

    while size > 7.5 and stringWidth(text, font_name, size) > usable_width:
        size -= 0.5

    return max(size, 7.5)


def draw_text_field(pdf: canvas.Canvas, field: dict[str, Any], value: str, debug_guides: bool) -> None:
    x, y, width, height = normalized_bbox_to_a4_points(field["bbox"])
    field_type = field["type"]

    if debug_guides:
        # The overlay is normally transparent text only. These guides are useful
        # during template QA because they show the approved blueprint geometry.
        pdf.saveState()
        if field_type == "line":
            pdf.setStrokeColor(green)
            pdf.setLineWidth(1.2)
            pdf.line(x, y + 1.5, x + width, y + 1.5)
        else:
            pdf.setStrokeColor(red)
            pdf.setLineWidth(1.0)
            pdf.rect(x, y, width, height, stroke=1, fill=0)
        pdf.restoreState()

    if not value:
        return

    font_name = "Helvetica"
    font_size = fit_font_size(value, width, height, font_name)
    text_width = stringWidth(value, font_name, font_size)

    pdf.saveState()
    if hasattr(pdf, "setFillAlpha"):
        pdf.setFillAlpha(1.0)
    pdf.setFillColor(Color(0, 0, 0, alpha=1.0))
    pdf.setFont(font_name, font_size)

    text_x = x + max((width - text_width) / 2.0, 2.0)
    # For "line" fields we bias the text toward the bottom so it visually sits
    # on the writing baseline. For "box" fields we center it vertically.
    if field_type == "line":
        text_y = y + max(height * 0.15, 2.0)
    else:
        text_y = y + max((height - font_size) / 2.0, 2.0)

    pdf.drawString(text_x, text_y, value)
    pdf.restoreState()


def generate_overlay_pdf(
    blueprint: dict[str, Any],
    record: dict[str, Any],
    output_path: str | Path,
    debug_guides: bool = False,
    include_background: bool = False,
) -> Path:
    """
    Build a transparent A4 overlay. The PDF has no background; it contains only
    the mapped text values and, optionally, debug outlines.
    """

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(str(output_path), pagesize=A4, pageCompression=1)
    pdf.setAuthor("QuickCert HITL Overlay Engine")
    pdf.setTitle(f"{blueprint.get('template_id', 'quickcert')}_overlay")
    pdf.setSubject("Overlay PDF generated from an approved blueprint")

    if include_background:
        source_image_url = blueprint.get("source_image_url")
        if source_image_url:
            import urllib.request
            import tempfile
            
            image_path = None
            if source_image_url.startswith("http"):
                try:
                    tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                    urllib.request.urlretrieve(source_image_url, tmp_img.name)
                    image_path = tmp_img.name
                except Exception:
                    pass
            else:
                base_dir = Path(__file__).resolve().parent.parent
                possible_path = base_dir / "public" / source_image_url.lstrip("/")
                if possible_path.exists():
                    image_path = str(possible_path)
            
            if image_path:
                pdf.drawImage(image_path, 0, 0, width=A4[0], height=A4[1])

    for field in blueprint.get("fields", []):
        draw_text_field(pdf, field, resolve_field_value(field, record), debug_guides)

    pdf.showPage()
    pdf.save()
    return output_path
