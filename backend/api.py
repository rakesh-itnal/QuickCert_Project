from __future__ import annotations

import json
import logging
import mimetypes
import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel, Field, model_validator

from .pdf_engine import generate_overlay_pdf
from .vlm_parser import recommend_fields


# The new HITL service lives beside the existing app so we can introduce the
# workflow safely without rewriting the current product.
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
BLUEPRINTS_DIR = DATA_DIR / "blueprints"
GENERATED_DIR = DATA_DIR / "generated"

for directory in (DATA_DIR, UPLOADS_DIR, BLUEPRINTS_DIR, GENERATED_DIR):
    directory.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("quickcert-hitl")

AVAILABLE_COLUMNS = [
    "name",
    "uniqueId",
    "issueDate",
    "expiresAt",
    "documentNumber",
    "organizationName",
    "registrationNumber",
    "remarks",
    "status",
    "details",
    "description",
]

DUMMY_RECORDS = [
    {
        "name": "Acme Industrial Corporation",
        "uniqueId": "ACME-2026-X1",
        "issueDate": "20-08-2026",
        "expiresAt": "20-08-2027",
        "documentNumber": "DOC-2026-000001",
        "organizationName": "Global Standards Body",
        "registrationNumber": "GSB-TAX-998877",
        "remarks": "Passed all quality compliance guidelines.",
        "status": "VALID",
        "details": "High quality steel production line inspection.",
        "description": "Standard Compliance Certificate"
    },
    {
        "name": "Jane Smith",
        "uniqueId": "EMP-9921",
        "issueDate": "20-08-2026",
        "expiresAt": "",
        "documentNumber": "DOC-2026-000002",
        "organizationName": "QuickCert Services Ltd",
        "registrationNumber": "QCS-REG-5544",
        "remarks": "Excellent performance during the annual evaluation.",
        "status": "VALID",
        "details": "Senior Software Architect Promotion Letter",
        "description": "Letter of Experience & Promotion"
    }
]


class BlueprintField(BaseModel):
    id: str
    label: str
    type: Literal["line", "box"]
    bbox: list[int] = Field(min_length=4, max_length=4)
    mapping_column: str | None = None
    manual_text: str | None = ""


class BlueprintPayload(BaseModel):
    template_id: str
    source_image_url: str
    image_width: int
    image_height: int
    fields: list[BlueprintField]


class GenerateOverlayRequest(BaseModel):
    blueprint_id: str | None = None
    blueprint: BlueprintPayload | None = None
    record_index: int = 0
    record_data: dict[str, Any] | None = None
    debug_guides: bool = False
    include_background: bool = False

    @model_validator(mode="after")
    def ensure_blueprint_input(self) -> "GenerateOverlayRequest":
        if not self.blueprint_id and not self.blueprint:
            raise ValueError("Provide either blueprint_id or blueprint.")
        return self


app = FastAPI(
    title="QuickCert HITL IDP",
    description="Gemini-powered human-in-the-loop certificate blueprinting and overlay generation.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/assets/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/assets/generated", StaticFiles(directory=GENERATED_DIR), name="generated")


def guess_extension(upload: UploadFile) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix:
        return suffix

    guessed = mimetypes.guess_extension(upload.content_type or "")
    return guessed or ".png"


def blueprint_path(template_id: str) -> Path:
    return BLUEPRINTS_DIR / f"{template_id}.json"


def save_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_blueprint(template_id: str) -> dict[str, Any]:
    path = blueprint_path(template_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Blueprint '{template_id}' not found.")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/")
async def serve_frontend() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/columns")
async def get_columns() -> dict[str, Any]:
    return {"columns": AVAILABLE_COLUMNS, "dummy_records": DUMMY_RECORDS}


@app.post("/api/recommend-fields")
async def recommend_fields_endpoint(file: UploadFile = File(...)) -> dict[str, Any]:
    # The architecture is intentionally image-first. We do not run OCR or CV
    # preprocessing here; the blank certificate image goes directly to Gemini.
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    template_id = uuid.uuid4().hex
    extension = guess_extension(file)
    upload_path = UPLOADS_DIR / f"{template_id}{extension}"

    try:
        # Cache the raw template image so the browser can render the exact same
        # asset the model analyzed.
        with upload_path.open("wb") as destination:
            shutil.copyfileobj(file.file, destination)

        with Image.open(upload_path) as uploaded_image:
            image_width, image_height = uploaded_image.size

        # Gemini returns only normalized field candidates. The browser remains
        # the source of truth for user correction after this point.
        fields = recommend_fields(upload_path)
    except Exception as exc:
        logger.exception("Field recommendation failed.")
        if upload_path.exists():
            upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        await file.close()

    payload = {
        "template_id": template_id,
        "source_image_url": f"/assets/uploads/{upload_path.name}",
        "image_width": image_width,
        "image_height": image_height,
        "available_columns": AVAILABLE_COLUMNS,
        "fields": fields,
    }

    return payload


@app.post("/api/blueprints")
async def save_blueprint(blueprint: BlueprintPayload) -> dict[str, Any]:
    # Saving the approved blueprint lets us reuse a corrected template without
    # asking the model again for every PDF generation request.
    payload = blueprint.model_dump()
    path = blueprint_path(blueprint.template_id)
    save_json(path, payload)
    return {
        "message": "Blueprint saved successfully.",
        "blueprint_id": blueprint.template_id,
        "blueprint_url": f"/api/blueprints/{blueprint.template_id}",
    }


@app.get("/api/blueprints/{template_id}")
async def get_blueprint(template_id: str) -> dict[str, Any]:
    return load_blueprint(template_id)


@app.post("/api/generate-overlay")
async def generate_overlay(request: GenerateOverlayRequest) -> dict[str, Any]:
    # Allow generation from either a saved blueprint id or the live in-browser
    # state. This keeps the frontend fast during iterative testing.
    blueprint = request.blueprint.model_dump() if request.blueprint else load_blueprint(request.blueprint_id or "")

    if request.record_data is not None:
        record = request.record_data
    else:
        record = DUMMY_RECORDS[request.record_index % len(DUMMY_RECORDS)]

    output_name = f"{blueprint['template_id']}_{uuid.uuid4().hex[:8]}.pdf"
    output_path = GENERATED_DIR / output_name

    try:
        generate_overlay_pdf(
            blueprint=blueprint,
            record=record,
            output_path=output_path,
            debug_guides=request.debug_guides,
            include_background=request.include_background,
        )
    except Exception as exc:
        logger.exception("PDF generation failed.")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "message": "Overlay PDF generated successfully.",
        "download_url": f"/assets/generated/{output_name}",
        "record_used": record,
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HITL_HOST", "127.0.0.1")
    port = int(os.getenv("HITL_PORT", "8001"))
    uvicorn.run("backend.api:app", host=host, port=port, reload=True)
