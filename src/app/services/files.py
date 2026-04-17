import io
import secrets
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException

from src.app.settings import (
    ALLOWED_EXTENSION,
    BASE_URL,
    FILE_ID_ALPHABET,
    FILE_ID_LENGTH,
    FILE_ID_MAX_ATTEMPTS,
    IMAGES_DIR,
    STORAGE_DIR,
)


def validate_filename(filename: str | None) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="A filename is required.")

    safe_name = Path(filename).name
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    if Path(safe_name).suffix.lower() != ALLOWED_EXTENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Only {ALLOWED_EXTENSION} files are allowed.",
        )

    return safe_name


def build_download_url(file_id: str) -> str:
    configured_base_url = BASE_URL.rstrip("/")
    if configured_base_url:
        return f"{configured_base_url}/files/{file_id}"
    return f"/files/{file_id}"


def build_image_url(image_name: str) -> str:
    configured_base_url = BASE_URL.rstrip("/")
    if configured_base_url:
        return f"{configured_base_url}/images/{image_name}"
    return f"/images/{image_name}"


def is_valid_file_id(file_id: str) -> bool:
    return len(file_id) == FILE_ID_LENGTH and all(char in FILE_ID_ALPHABET for char in file_id)


def is_valid_image_name(image_name: str) -> bool:
    safe_name = Path(image_name).name
    return safe_name == image_name and image_name.endswith(".jpg")


def generate_unique_file_id() -> str:
    for _ in range(FILE_ID_MAX_ATTEMPTS):
        file_id = "".join(secrets.choice(FILE_ID_ALPHABET) for _ in range(FILE_ID_LENGTH))
        if not (STORAGE_DIR / f"{file_id}{ALLOWED_EXTENSION}").exists():
            return file_id
    raise HTTPException(status_code=503, detail="Could not allocate a unique file id.")


def compress_image_to_jpeg(raw_bytes: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img = img.convert("RGB")
            output = io.BytesIO()
            img.save(output, format="JPEG", optimize=True, quality=70)
            return output.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail="Invalid image file uploaded.") from exc


def ltd_path(file_id: str):
    return STORAGE_DIR / f"{file_id}{ALLOWED_EXTENSION}"


def image_path(image_name: str):
    return IMAGES_DIR / image_name
