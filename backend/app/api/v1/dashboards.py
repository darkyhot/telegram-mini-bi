import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import DashboardCommentIn, DashboardCommentOut, DashboardIn, DashboardOut, DashboardTeamShareIn
from app.models.database import get_db
from app.models.entities import User
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
        created_at=dashboard.created_at.isoformat(),
        updated_at=dashboard.updated_at.isoformat(),
    )


def _to_comment_out(db: Session, comment) -> DashboardCommentOut:
    user = db.query(User).filter(User.id == comment.user_id).first()
    return DashboardCommentOut(
        id=comment.id,
        dashboard_id=comment.dashboard_id,
        user_telegram_id=user.telegram_id if user else 0,
        text=comment.text,
        created_at=comment.created_at.isoformat(),
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


@router.get("", response_model=list[DashboardOut])
def list_dashboards(telegram_id: int, dataset_id: int | None = None, db: Session = Depends(get_db)) -> list[DashboardOut]:
    service = DashboardService(db)
    dashboards = service.list_dashboards(telegram_id=telegram_id, dataset_id=dataset_id)
    return [_to_dashboard_out(d) for d in dashboards]


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


@router.post("/{dashboard_id}/team-share")
def share_dashboard_to_team(dashboard_id: int, payload: DashboardTeamShareIn, db: Session = Depends(get_db)) -> dict:
    service = DashboardService(db)
    share = service.share_dashboard_to_team(
        telegram_id=payload.telegram_id,
        dashboard_id=dashboard_id,
        team_id=payload.team_id,
        permission=payload.permission,
    )
    return {
        "dashboard_id": share.dashboard_id,
        "team_id": share.team_id,
        "permission": share.permission,
        "created_at": share.created_at.isoformat(),
    }


@router.get("/{dashboard_id}/comments", response_model=list[DashboardCommentOut])
def list_dashboard_comments(dashboard_id: int, telegram_id: int, db: Session = Depends(get_db)) -> list[DashboardCommentOut]:
    service = DashboardService(db)
    comments = service.list_comments(telegram_id=telegram_id, dashboard_id=dashboard_id)
    return [_to_comment_out(db, c) for c in comments]


@router.post("/{dashboard_id}/comments", response_model=DashboardCommentOut)
def add_dashboard_comment(dashboard_id: int, payload: DashboardCommentIn, db: Session = Depends(get_db)) -> DashboardCommentOut:
    service = DashboardService(db)
    comment = service.add_comment(telegram_id=payload.telegram_id, dashboard_id=dashboard_id, text=payload.text)
    return _to_comment_out(db, comment)


@public_router.get("/{token}", response_model=DashboardOut)
def get_public_dashboard(token: str, db: Session = Depends(get_db)) -> DashboardOut:
    service = DashboardService(db)
    dashboard = service.get_public_dashboard(token)
    return _to_dashboard_out(dashboard)
