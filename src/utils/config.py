import json
from functools import lru_cache
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = PROJECT_ROOT / "config.json"


@lru_cache(maxsize=1)
def get_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as config_file:
        return json.load(config_file)


config = get_config()
