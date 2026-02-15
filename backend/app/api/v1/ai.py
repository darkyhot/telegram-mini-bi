import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.agents import AIAgentService
from app.api.schemas import (
    AIHistoryOut,
    AIProfileOut,
    AIQueryIn,
    AIQueryOut,
    ComparePeriodsIn,
    ComparePeriodsOut,
    ExplainChartIn,
    ExplainChartOut,
    NL2DashboardIn,
    NL2DashboardOut,
)
from app.models.database import get_db
from app.services.dataset_service import DatasetService

router = APIRouter()


@router.post("/profile/{dataset_id}", response_model=AIProfileOut)
async def profile_dataset(dataset_id: int, telegram_id: int, db: Session = Depends(get_db)) -> AIProfileOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.profile_dataset(dataset)

    response = {
        "summary": result["summary"],
        "insights": result["insights"],
        "suggested_visualizations": result["suggested_visualizations"],
    }
    dataset_service.save_ai_run(
        dataset=dataset,
        telegram_id=telegram_id,
        run_type="profile",
        response=response,
        attempts=result.get("attempts", 1),
        error_log=result.get("error_log", []),
    )
    return AIProfileOut(**response)


@router.post("/query/{dataset_id}", response_model=AIQueryOut)
async def ask_ai(dataset_id: int, payload: AIQueryIn, telegram_id: int, db: Session = Depends(get_db)) -> AIQueryOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.ask(dataset=dataset, question=payload.question)

    response = {
        "answer": result["answer"],
        "pandas_query": result["pandas_query"],
        "chart_config": json.loads(json.dumps(result["chart_config"])),
        "chart_data": result["chart_data"],
    }
    dataset_service.save_ai_run(
        dataset=dataset,
        telegram_id=telegram_id,
        run_type="query",
        response=response,
        question=payload.question,
        attempts=result.get("attempts", 1),
        error_log=result.get("error_log", []),
    )
    return AIQueryOut(**response)


@router.post("/compare/{dataset_id}", response_model=ComparePeriodsOut)
async def compare_periods(dataset_id: int, payload: ComparePeriodsIn, telegram_id: int, db: Session = Depends(get_db)) -> ComparePeriodsOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.compare_periods(
        dataset=dataset,
        date_column=payload.date_column,
        value_column=payload.value_column,
        period=payload.period,
    )
    dataset_service.save_ai_run(
        dataset=dataset,
        telegram_id=telegram_id,
        run_type="compare",
        response=result,
        question=f"compare:{payload.period}:{payload.date_column}:{payload.value_column}",
    )
    return ComparePeriodsOut(**result)


@router.post("/nl2dashboard/{dataset_id}", response_model=NL2DashboardOut)
async def nl2dashboard(dataset_id: int, payload: NL2DashboardIn, telegram_id: int, db: Session = Depends(get_db)) -> NL2DashboardOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.generate_dashboard(dataset=dataset, prompt_text=payload.prompt)
    dataset_service.save_ai_run(
        dataset=dataset,
        telegram_id=telegram_id,
        run_type="nl2dashboard",
        response=result,
        question=payload.prompt,
    )
    return NL2DashboardOut(**result)


@router.post("/explain/{dataset_id}", response_model=ExplainChartOut)
async def explain_chart(dataset_id: int, payload: ExplainChartIn, telegram_id: int, db: Session = Depends(get_db)) -> ExplainChartOut:
    dataset_service = DatasetService(db)
    dataset = dataset_service.get_dataset(dataset_id, telegram_id)
    ai_service = AIAgentService(dataset_service)
    result = await ai_service.explain_chart(
        dataset=dataset,
        chart_config=payload.chart_config,
        chart_data=payload.chart_data,
        question=payload.question,
    )
    dataset_service.save_ai_run(
        dataset=dataset,
        telegram_id=telegram_id,
        run_type="explain",
        response=result,
        question=payload.question,
    )
    return ExplainChartOut(**result)


@router.get("/history/{dataset_id}", response_model=AIHistoryOut)
def get_ai_history(dataset_id: int, telegram_id: int, db: Session = Depends(get_db)) -> AIHistoryOut:
    dataset_service = DatasetService(db)
    profile, queries = dataset_service.get_ai_history(dataset_id, telegram_id)

    profile_payload = None
    if profile:
        profile_payload = AIProfileOut(
            summary=str(profile.get("summary", "Dataset profile generated.")),
            insights=[str(i) for i in profile.get("insights", [])],
            suggested_visualizations=profile.get("suggested_visualizations", []),
        )

    return AIHistoryOut(profile=profile_payload, queries=queries)
