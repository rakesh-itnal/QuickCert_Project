from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")


class VLMField(BaseModel):
    """
    Schema enforced on Gemini so the model returns machine-usable JSON only.
    """

    label: str = Field(
        description="Short human-readable description of the writable region."
    )
    type: Literal["line", "box"] = Field(
        description="Use 'line' for underline-like writing areas and 'box' for bounded fields."
    )
    bbox: list[int] = Field(
        min_length=4,
        max_length=4,
        description="Normalized [ymin, xmin, ymax, xmax] integers in the 0-1000 range.",
    )


def _clamp(value: int, low: int = 0, high: int = 1000) -> int:
    return max(low, min(high, int(value)))


def _normalize_bbox(raw_bbox: list[int]) -> list[int]:
    if len(raw_bbox) != 4:
        raise ValueError("Each bbox must contain exactly four values.")

    ymin, xmin, ymax, xmax = [_clamp(value) for value in raw_bbox]
    if ymax <= ymin:
        ymax = min(1000, ymin + 12)
    if xmax <= xmin:
        xmax = min(1000, xmin + 12)

    return [ymin, xmin, ymax, xmax]


def _prompt() -> str:
    return """
You are analyzing a blank business document template for a human-in-the-loop form filling tool.

Return ONLY a JSON array.
Do not wrap the answer in markdown.
Do not include commentary.

Detect the writable regions that a human would later map to business, entity, or organizational data.
Each array item must contain:
- label: a short recommended field name
- type: either "line" or "box"
- bbox: [ymin, xmin, ymax, xmax] normalized to integers on a 0-1000 scale

Detection rules:
- The coordinate origin is the top-left of the full image.
- "line" means underline-style or open writing regions.
- "box" means bounded rectangular writing regions.
- Detect only blank fillable areas, not headings, logos, seals, borders, watermarks, signatures, photos, or decorative shapes.
- Prefer one field per writable region.
- Merge multi-word writing space into a single field when it clearly belongs together.
- Keep boxes reasonably tight around the empty writable area.
- Return between 3 and 30 high-confidence fields.
""".strip()


def recommend_fields(image_path: str | Path, model_name: str | None = None) -> list[dict]:
    """
    Call Gemini Vision using the official `google.genai` SDK and return validated
    field recommendations ready for the frontend canvas.
    """

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing. Set it in your .env file.")

    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"Template image not found: {image_path}")

    # The project explicitly uses the current Google GenAI SDK rather than any
    # legacy client, so we instantiate the official `google.genai` client here.
    client = genai.Client(api_key=api_key)
    selected_model = model_name or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    with Image.open(image_path) as raw_image:
        image = raw_image.copy()

    # JSON mode keeps the response deterministic enough for direct rendering in
    # the drag-and-drop UI.
    response = client.models.generate_content(
        model=selected_model,
        contents=[_prompt(), image],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[VLMField],
            temperature=0.1,
        ),
    )

    # The SDK usually parses JSON mode responses for us. The fallback parser is
    # kept for resilience across model / SDK edge cases.
    parsed = response.parsed
    if parsed is None:
        payload = json.loads(response.text)
        parsed = [VLMField.model_validate(item) for item in payload]

    fields: list[dict] = []
    for index, item in enumerate(parsed, start=1):
        field = item if isinstance(item, VLMField) else VLMField.model_validate(item)
        fields.append(
            {
                "id": f"field_{index:02d}",
                "label": field.label.strip() or f"Field {index}",
                "type": field.type,
                "bbox": _normalize_bbox(field.bbox),
                "mapping_column": None,
                "manual_text": "",
            }
        )

    if not fields:
        raise RuntimeError("The VLM did not return any field recommendations.")

    return fields
