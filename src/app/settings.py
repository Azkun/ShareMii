from pathlib import Path

from src.utils.config import config

api_config = config.get("api", {})

MAX_FILE_SIZE = int(api_config.get("max_file_size", 20 * 1024))
ALLOWED_EXTENSION = str(api_config.get("allowed_extension", ".ltd"))
BASE_URL = str(api_config.get("base_url", ""))
STORAGE_DIR = Path("storage")
IMAGES_DIR = STORAGE_DIR / "images"
MAX_IMAGES = int(api_config.get("max_images", 5))
MAX_SINGLE_IMAGE_UPLOAD_SIZE = int(api_config.get("max_single_image_upload_size", 10 * 1024 * 1024))
UPLOAD_WINDOW_SECONDS = int(api_config.get("upload_window_seconds", 600))
UPLOAD_BYTE_LIMIT = int(api_config.get("upload_byte_limit", 25 * 1024))
DOWNLOAD_WINDOW_SECONDS = int(api_config.get("download_window_seconds", 60))
DOWNLOAD_BYTE_LIMIT = int(api_config.get("download_byte_limit", 250 * 1024))
FILE_ID_LENGTH = int(api_config.get("file_id_length", 6))
FILE_ID_ALPHABET = str(api_config.get("file_id_alphabet", "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"))
FILE_ID_MAX_ATTEMPTS = int(api_config.get("file_id_max_attempts", 50))


def ensure_directories() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
