import hashlib
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request


class ByteRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[tuple[float, int]]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, cost: int, window_seconds: int, byte_limit: int) -> int | None:
        now = time.monotonic()

        with self._lock:
            events = self._events[key]
            while events and now - events[0][0] >= window_seconds:
                events.popleft()

            used_bytes = sum(size for _, size in events)
            if used_bytes + cost > byte_limit:
                if not events:
                    return window_seconds
                return max(1, int(window_seconds - (now - events[0][0])))

            events.append((now, cost))
            return None


def get_client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_host = forwarded_for or (request.client.host if request.client else "unknown")
    return hashlib.sha256(client_host.encode("utf-8")).hexdigest()


def enforce_rate_limit(
    limiter: ByteRateLimiter,
    request: Request,
    *,
    cost: int,
    window_seconds: int,
    byte_limit: int,
    detail: str,
) -> None:
    retry_after = limiter.allow(
        key=get_client_key(request),
        cost=cost,
        window_seconds=window_seconds,
        byte_limit=byte_limit,
    )
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail=detail,
            headers={"Retry-After": str(retry_after)},
        )


upload_limiter = ByteRateLimiter()
download_limiter = ByteRateLimiter()
