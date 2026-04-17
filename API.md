# ShareMii Upload API

Public FastAPI API for sharing Mii files with optional metadata and up to 5 compressed preview images.

## Features

- Public endpoints (no API token)
- `.ltd` upload only
- Mii file size limit: `20 KB`
- Optional metadata on upload:
	- `name`
	- `author`
	- `description`
- Optional image uploads (`images`, up to 5 files)
- Uploaded images are compressed to JPEG and stored in `storage/images`
- MySQL persistence for Mii metadata and image paths
- 6-character manual-friendly share codes (`file_id`)
- In-memory rate limiting by client hash for upload and download traffic

## Endpoints

- `GET /`
	- Service info and rate-limit config.
- `POST /upload`
	- Upload `.ltd` file with optional metadata and images.
- `GET /files/{file_id}`
	- Download an `.ltd` file.
- `GET /images/{image_name}`
	- Download one stored compressed image.
- `GET /miis/{file_id}`
	- Retrieve metadata + image URLs for one Mii.

## Database

This project expects MySQL credentials in `config.json`:

```json
{
	"mysql": {
		"host": "localhost",
		"port": 3306,
		"user": "root",
		"password": "password",
		"database": "sharemii_upload"
	}
}
```

On startup, the API initializes tables from `src/utils/sql/init_db.sql`.

## Run

```bash
pip install -r requirements.txt
python main.py
```

Default URLs:

```text
FastAPI: http://127.0.0.1:3000
Django (ShareMii UI): http://127.0.0.1:8000
```

## Curl

### 1) Upload only the Mii file

```bash
curl -X POST "http://127.0.0.1:3000/upload" \
	-F "file=@sample.ltd"
```

### 2) Upload with metadata and up to 5 images

```bash
curl -X POST "http://127.0.0.1:3000/upload" \
	-F "file=@sample.ltd" \
	-F "name=My Mii" \
	-F "author=MyUsername" \
	-F "description=Created on Switch" \
	-F "images=@preview1.png" \
	-F "images=@preview2.jpg"
```

Example response:

```json
{
	"file_id": "A7K2Q9",
	"name": "My Mii",
	"author": "MyUsername",
	"description": "Created on Switch",
	"original_filename": "sample.ltd",
	"stored_filename": "A7K2Q9.ltd",
	"size_bytes": 436,
	"download_url": "/files/A7K2Q9",
	"images": [
		"/images/A7K2Q9_1.jpg",
		"/images/A7K2Q9_2.jpg"
	]
}
```

### 3) Download Mii file by code

```bash
curl "http://127.0.0.1:3000/files/A7K2Q9" --output downloaded.ltd
```

### 4) Get metadata by code

```bash
curl "http://127.0.0.1:3000/miis/A7K2Q9"
```

### 5) Download one preview image

```bash
curl "http://127.0.0.1:3000/images/A7K2Q9_1.jpg" --output preview.jpg
```

## Notes

- Rate limits are memory-based and reset when the server restarts.
- Invalid `.ltd` upload extension returns `400`.
- Invalid share code (`file_id`) format returns `400`.
- Missing file/image/metadata entries return `404`.
- Upload/download over rate budget returns `429`.
