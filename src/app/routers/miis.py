import mysql.connector
from fastapi import APIRouter, HTTPException

from src.app.services.files import build_download_url, build_image_url, is_valid_file_id
from src.utils.sql import get_mii

router = APIRouter()


@router.get("/miis/{file_id}")
def get_mii_details(file_id: str) -> dict:
    if not is_valid_file_id(file_id):
        raise HTTPException(status_code=400, detail="Invalid file identifier.")

    try:
        mii = get_mii(file_id)
    except mysql.connector.Error as exc:
        raise HTTPException(status_code=500, detail="Could not fetch Mii metadata.") from exc

    if not mii:
        raise HTTPException(status_code=404, detail="Mii metadata not found.")

    return {
        "file_id": mii["unique_id"],
        "name": mii["name"],
        "author": mii["author"],
        "description": mii["description"],
        "created_at": mii["created_at"],
        "download_url": build_download_url(mii["unique_id"]),
        "images": [build_image_url(image_name) for image_name in mii["images"]],
    }
