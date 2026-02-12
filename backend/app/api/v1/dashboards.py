import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import DashboardIn, DashboardOut
from app.models.database import get_db
from app.services.dashboard_service import DashboardService

router = APIRouter()
public_router = APIRouter()


def _to_dashboard_out(dashboard) -> DashboardOut:
    return DashboardOut(
        id=dashboard.id,
        title=dashboard.title,
        dataset_id=dashboard.dataset_id,
        config=json.loads(dashboard.config_json),
        share_token=dashboard.share_token,
        is_public=dashboard.is_public,
    )


@router.post("/save", response_model=DashboardOut)
def save_dashboard(payload: DashboardIn, db: Session = Depends(get_db)) -> DashboardOut:
    service = DashboardService(db)
    dashboard = service.save_dashboard(
        telegram_id=payload.telegram_id,
        dataset_id=payload.dataset_id,
        title=payload.title,
        config=payload.config,
        dashboard_id=payload.dashboard_id,
    )
    return _to_dashboard_out(dashboard)


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: int, telegram_id: int, db: Session = Depends(get_db)) -> DashboardOut:
    service = DashboardService(db)
    dashboard = service.get_dashboard(telegram_id=telegram_id, dashboard_id=dashboard_id)
    return _to_dashboard_out(dashboard)


@router.post("/{dashboard_id}/share", response_model=DashboardOut)
def share_dashboard(dashboard_id: int, telegram_id: int, db: Session = Depends(get_db)) -> DashboardOut:
    service = DashboardService(db)
    dashboard = service.share_dashboard(telegram_id=telegram_id, dashboard_id=dashboard_id)
    return _to_dashboard_out(dashboard)


@public_router.get("/{token}", response_model=DashboardOut)
def get_public_dashboard(token: str, db: Session = Depends(get_db)) -> DashboardOut:
    service = DashboardService(db)
    dashboard = service.get_public_dashboard(token)
    return _to_dashboard_out(dashboard)
