import os
import signal
import subprocess
import sys

from src.app.main import app
from src.utils.config import config


if __name__ == "__main__":
    import uvicorn

    api_config = config.get("api", {})
    django_config = config.get("django", {})

    api_host = str(api_config.get("host", "0.0.0.0"))
    api_port = int(api_config.get("port", 3000))
    django_host = str(django_config.get("host", "127.0.0.1"))
    django_port = int(django_config.get("port", 8000))

    django_env = os.environ.copy()
    django_env["DJANGO_SETTINGS_MODULE"] = "src.sharemii_server.settings"
    django_cmd = [
        sys.executable,
        "manage.py",
        "runserver",
        f"{django_host}:{django_port}",
        "--noreload",
    ]

    django_process = subprocess.Popen(django_cmd, env=django_env)

    try:
        uvicorn.run(app, host=api_host, port=api_port)
    finally:
        if django_process.poll() is None:
            django_process.send_signal(signal.SIGTERM)
            try:
                django_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                django_process.kill()
