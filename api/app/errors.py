"""OpenAI-compatible error type and the FastAPI exception handlers that render it."""

from __future__ import annotations

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class OpenAIError(Exception):
    """An error shaped like OpenAI's ``{"error": {...}}`` envelope."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        *,
        type: str = "invalid_request_error",
        code: str | None = None,
        param: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.type = type
        self.code = code
        self.param = param

    def body(self) -> dict:
        return {
            "error": {
                "message": self.message,
                "type": self.type,
                "param": self.param,
                "code": self.code,
            }
        }


async def openai_error_handler(_request: Request, exc: OpenAIError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.body())


async def http_error_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    if exc.status_code == 404:
        code, kind = "not_found", "invalid_request_error"
    elif 400 <= exc.status_code < 500:
        code, kind = None, "invalid_request_error"
    else:
        code, kind = None, "server_error"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {"message": detail, "type": kind, "param": None, "code": code}
        },
    )


async def validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    first = errors[0] if errors else {}
    # `loc` looks like ("body", "file"); the body marker is noise for clients.
    loc = ".".join(str(part) for part in first.get("loc", []) if part != "body")
    message = str(first.get("msg", "Invalid request."))
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "message": f"{message} (param: {loc})" if loc else message,
                "type": "invalid_request_error",
                "param": loc or None,
                "code": "invalid_request",
            }
        },
    )
