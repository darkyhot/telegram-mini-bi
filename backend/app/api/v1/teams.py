from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import TeamCreateIn, TeamMemberAddIn, TeamMemberOut, TeamOut
from app.models.database import get_db
from app.models.entities import User
from app.services.team_service import TeamService

router = APIRouter()


def _to_team_out(team) -> TeamOut:
    return TeamOut(
        id=team.id,
        name=team.name,
        owner_telegram_id=0,
        created_at=team.created_at.isoformat(),
    )


def _owner_telegram_id(db: Session, user_id: int) -> int:
    owner = db.query(User).filter(User.id == user_id).first()
    return owner.telegram_id if owner else 0


@router.post("", response_model=TeamOut)
def create_team(payload: TeamCreateIn, db: Session = Depends(get_db)) -> TeamOut:
    service = TeamService(db)
    team = service.create_team(payload.telegram_id, payload.name)
    return TeamOut(
        id=team.id,
        name=team.name,
        owner_telegram_id=payload.telegram_id,
        created_at=team.created_at.isoformat(),
    )


@router.get("", response_model=list[TeamOut])
def list_teams(telegram_id: int, db: Session = Depends(get_db)) -> list[TeamOut]:
    service = TeamService(db)
    teams = service.list_teams(telegram_id)
    return [
        TeamOut(
            id=t.id,
            name=t.name,
            owner_telegram_id=_owner_telegram_id(db, t.owner_user_id),
            created_at=t.created_at.isoformat(),
        )
        for t in teams
    ]


@router.get("/{team_id}/members", response_model=list[TeamMemberOut])
def list_members(team_id: int, telegram_id: int, db: Session = Depends(get_db)) -> list[TeamMemberOut]:
    service = TeamService(db)
    rows = service.list_members(telegram_id, team_id)
    return [
        TeamMemberOut(
            team_id=r.team_id,
            member_telegram_id=_owner_telegram_id(db, r.user_id),
            role=r.role,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.post("/{team_id}/members", response_model=TeamMemberOut)
def add_member(team_id: int, payload: TeamMemberAddIn, db: Session = Depends(get_db)) -> TeamMemberOut:
    service = TeamService(db)
    row = service.add_member(
        actor_telegram_id=payload.actor_telegram_id,
        team_id=team_id,
        member_telegram_id=payload.member_telegram_id,
        role=payload.role,
    )
    return TeamMemberOut(
        team_id=row.team_id,
        member_telegram_id=payload.member_telegram_id,
        role=row.role,
        created_at=row.created_at.isoformat(),
    )
