import json
import sys
from pathlib import Path

sys.path.append(str(Path(".").resolve()))

from backend.pdf_engine import generate_overlay_pdf
from backend.api import DUMMY_RECORDS

blueprint = {
    "template_id": "test_tmpl",
    "source_image_url": "test.png",
    "image_width": 1000,
    "image_height": 1000,
    "fields": [
        {
            "id": "f1",
            "label": "Test Name",
            "type": "box",
            "bbox": [100, 100, 200, 200],
            "mapping_column": "name",
            "manual_text": ""
        }
    ]
}

generate_overlay_pdf(blueprint, DUMMY_RECORDS[0], "test_overlay.pdf", debug_guides=True, include_background=False)
print("done")
