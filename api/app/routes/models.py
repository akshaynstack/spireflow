"""`GET /v1/models` — OpenAI-compatible model listing."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..config import settings
from ..errors import OpenAIError
from ..schemas import ModelList, ModelObject
from ..security import Principal, require_api_key

router = APIRouter()

OWNER = "spireflow"


def _model(model_id: str) -> ModelObject:
    return ModelObject(id=model_id, owned_by=OWNER)


@router.get("/models", response_model=ModelList)
def list_models(_: Principal = Depends(require_api_key)) -> ModelList:
    return ModelList(data=[_model(model_id) for model_id in settings.models])


@router.get("/models/{model_id}", response_model=ModelObject)
def retrieve_model(
    model_id: str, _: Principal = Depends(require_api_key)
) -> ModelObject:
    if model_id not in settings.models:
        raise OpenAIError(
            f"The model '{model_id}' does not exist.",
            404,
            code="model_not_found",
            param="model",
        )
    return _model(model_id)
