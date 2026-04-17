from fastapi import APIRouter

from src.app.settings import (
    ALLOWED_EXTENSION,
    DOWNLOAD_BYTE_LIMIT,
    DOWNLOAD_WINDOW_SECONDS,
    MAX_FILE_SIZE,
    UPLOAD_BYTE_LIMIT,
    UPLOAD_WINDOW_SECONDS,
)

router = APIRouter()


@router.get("/")
def index() -> dict:
    return {
        "service": "ShareMii Upload API",
        "allowed_extension": ALLOWED_EXTENSION,
        "max_file_size_bytes": MAX_FILE_SIZE,
        "upload_limit": {
            "window_seconds": UPLOAD_WINDOW_SECONDS,
            "byte_limit": UPLOAD_BYTE_LIMIT,
        },
        "download_limit": {
            "window_seconds": DOWNLOAD_WINDOW_SECONDS,
            "byte_limit": DOWNLOAD_BYTE_LIMIT,
        },
    }
