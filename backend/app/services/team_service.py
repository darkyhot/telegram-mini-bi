from sqlalchemy.orm import Session

from app.models.entities import Team, TeamMember, User
from app.utils.middleware import AppException


class TeamService:
    def __init__(self, db: Session):
        self.db = db

    def _get_or_create_user(self, telegram_id: int) -> User:
        user = self.db.query(User).filter(User.telegram_id == telegram_id).first()
        if user:
            return user
        user = User(telegram_id=telegram_id)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _require_team_role(self, team_id: int, user_id: int, allowed_roles: set[str]) -> TeamMember:
        member = self.db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.user_id == user_id).first()
        if not member or member.role not in allowed_roles:
            raise AppException("No team permission", 403)
        return member

    def create_team(self, telegram_id: int, name: str) -> Team:
        owner = self._get_or_create_user(telegram_id)
        team = Team(name=name, owner_user_id=owner.id)
        self.db.add(team)
        self.db.commit()
        self.db.refresh(team)

        membership = TeamMember(team_id=team.id, user_id=owner.id, role="owner")
        self.db.add(membership)
        self.db.commit()
        return team

    def list_teams(self, telegram_id: int) -> list[Team]:
        user = self._get_or_create_user(telegram_id)
        return (
            self.db.query(Team)
            .join(TeamMember, TeamMember.team_id == Team.id)
            .filter(TeamMember.user_id == user.id)
            .order_by(Team.created_at.desc())
            .all()
        )

    def list_members(self, telegram_id: int, team_id: int) -> list[TeamMember]:
        user = self._get_or_create_user(telegram_id)
        self._require_team_role(team_id, user.id, {"owner", "editor", "viewer"})
        return (
            self.db.query(TeamMember)
            .filter(TeamMember.team_id == team_id)
            .order_by(TeamMember.created_at.asc())
            .all()
        )

    def add_member(self, actor_telegram_id: int, team_id: int, member_telegram_id: int, role: str) -> TeamMember:
        actor = self._get_or_create_user(actor_telegram_id)
        self._require_team_role(team_id, actor.id, {"owner"})
        member_user = self._get_or_create_user(member_telegram_id)

        existing = self.db.query(TeamMember).filter(TeamMember.team_id == team_id, TeamMember.user_id == member_user.id).first()
        if existing:
            existing.role = role
            self.db.commit()
            self.db.refresh(existing)
            return existing

        member = TeamMember(team_id=team_id, user_id=member_user.id, role=role)
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member
