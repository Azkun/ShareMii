from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from src.app.rate_limit import download_limiter, enforce_rate_limit
from src.app.services.files import image_path, is_valid_file_id, is_valid_image_name, ltd_path
from src.app.settings import DOWNLOAD_BYTE_LIMIT, DOWNLOAD_WINDOW_SECONDS

router = APIRouter()


@router.get("/files/{file_id}")
def download_file(file_id: str, request: Request) -> FileResponse:
    if not is_valid_file_id(file_id):
        raise HTTPException(status_code=400, detail="Invalid file identifier.")

    stored_path = ltd_path(file_id)
    if not stored_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    enforce_rate_limit(
        download_limiter,
        request,
        cost=stored_path.stat().st_size,
        window_seconds=DOWNLOAD_WINDOW_SECONDS,
        byte_limit=DOWNLOAD_BYTE_LIMIT,
        detail="Download rate limit exceeded for this client.",
    )

    return FileResponse(
        path=stored_path,
        filename=stored_path.name,
        media_type="application/octet-stream",
    )


@router.get("/images/{image_name}")
def download_image(image_name: str, request: Request) -> FileResponse:
    if not is_valid_image_name(image_name):
        raise HTTPException(status_code=400, detail="Invalid image name.")

    stored_image = image_path(image_name)
    if not stored_image.is_file():
        raise HTTPException(status_code=404, detail="Image not found.")

    enforce_rate_limit(
        download_limiter,
        request,
        cost=stored_image.stat().st_size,
        window_seconds=DOWNLOAD_WINDOW_SECONDS,
        byte_limit=DOWNLOAD_BYTE_LIMIT,
        detail="Download rate limit exceeded for this client.",
    )

    return FileResponse(
        path=stored_image,
        filename=stored_image.name,
        media_type="image/jpeg",
    )
