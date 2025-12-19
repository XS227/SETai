import logging
from typing import Callable
from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)


def RequestLoggingMiddleware(get_response: Callable[[HttpRequest], HttpResponse]):
    def middleware(request: HttpRequest) -> HttpResponse:
        logger.debug("Handling request", extra={"path": request.path, "user": str(request.user)})
        response = get_response(request)
        logger.debug("Response ready", extra={"status_code": response.status_code})
        return response

    return middleware
