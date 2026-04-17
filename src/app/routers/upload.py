import mysql.connector
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from src.app.rate_limit import enforce_rate_limit, upload_limiter
from src.app.services.files import (
    build_download_url,
    build_image_url,
    compress_image_to_jpeg,
    generate_unique_file_id,
    image_path,
    ltd_path,
    validate_filename,
)
from src.app.settings import (
    MAX_FILE_SIZE,
    MAX_IMAGES,
    MAX_SINGLE_IMAGE_UPLOAD_SIZE,
    UPLOAD_BYTE_LIMIT,
    UPLOAD_WINDOW_SECONDS,
)
from src.utils.sql import insert_mii, insert_mii_images

router = APIRouter()


@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    author: str | None = Form(default=None),
    description: str | None = Form(default=None),
    images: list[UploadFile] | None = File(default=None),
) -> dict:
    original_filename = validate_filename(file.filename)
    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum size is {MAX_FILE_SIZE} bytes.",
        )

    image_files = images or []
    if len(image_files) > MAX_IMAGES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_IMAGES} images allowed.")

    enforce_rate_limit(
        upload_limiter,
        request,
        cost=len(content),
        window_seconds=UPLOAD_WINDOW_SECONDS,
        byte_limit=UPLOAD_BYTE_LIMIT,
        detail="Upload rate limit exceeded for this client.",
    )

    raw_images: list[bytes] = []
    for image_file in image_files:
        image_raw = await image_file.read(MAX_SINGLE_IMAGE_UPLOAD_SIZE + 1)
        if len(image_raw) > MAX_SINGLE_IMAGE_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail="One of the images is too large.",
            )
        raw_images.append(image_raw)

    file_id = generate_unique_file_id()
    stored_path = ltd_path(file_id)
    stored_image_names: list[str] = []

    try:
        stored_path.write_bytes(content)

        for index, raw_image in enumerate(raw_images, start=1):
            compressed_image = compress_image_to_jpeg(raw_image)
            image_name = f"{file_id}_{index}.jpg"
            image_file_path = image_path(image_name)
            image_file_path.write_bytes(compressed_image)
            stored_image_names.append(image_name)

        insert_mii(file_id, name=name, author=author, description=description)
        insert_mii_images(file_id, stored_image_names)
    except mysql.connector.Error as exc:
        stored_path.unlink(missing_ok=True)
        for image_name in stored_image_names:
            image_path(image_name).unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not save Mii metadata.") from exc

    return {
        "file_id": file_id,
        "name": name,
        "author": author,
        "description": description,
        "original_filename": original_filename,
        "stored_filename": stored_path.name,
        "size_bytes": len(content),
        "download_url": build_download_url(file_id),
        "images": [build_image_url(image_name) for image_name in stored_image_names],
    }
