import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.agents import AIAgentService
from app.api.schemas import AIProfileOut, AIQueryIn, AIQueryOut
from app.models.database import get_db
from app.services.dataset_service import DatasetService

router = APIRouter()


@router.post("/profile/{dataset_id}", response_model=AIProfileOut)
async def profile_dataset(dataset_id: int, telegram_id: int, db: Session = Depends(get_db)) -> AIProfileOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.profile_dataset(dataset)
    return AIProfileOut(**result)


@router.post("/query/{dataset_id}", response_model=AIQueryOut)
async def ask_ai(dataset_id: int, payload: AIQueryIn, telegram_id: int, db: Session = Depends(get_db)) -> AIQueryOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.ask(dataset=dataset, question=payload.question)
    result["chart_config"] = json.loads(json.dumps(result["chart_config"]))
    return AIQueryOut(**result)
