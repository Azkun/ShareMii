from fastapi import FastAPI

from src.app.routers.download import router as download_router
from src.app.routers.index import router as index_router
from src.app.routers.miis import router as miis_router
from src.app.routers.upload import router as upload_router
from src.app.settings import ensure_directories
from src.utils.sql import init as init_db

app = FastAPI(title="ShareMii Upload API")


@app.on_event("startup")
def startup() -> None:
    ensure_directories()
    try:
        init_db()
    except Exception as exc:
        raise RuntimeError("Database initialization failed.") from exc


app.include_router(index_router)
app.include_router(upload_router)
app.include_router(download_router)
app.include_router(miis_router)
