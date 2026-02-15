import json
import secrets

from sqlalchemy.orm import Session

from app.models.entities import Dashboard, DashboardComment, DashboardTeamShare, Dataset, TeamMember, User
from app.utils.middleware import AppException


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def _get_user(self, telegram_id: int) -> User:
        user = self.db.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            raise AppException("User not found", 404)
        return user

    def _user_team_ids(self, user_id: int) -> list[int]:
        rows = self.db.query(TeamMember.team_id).filter(TeamMember.user_id == user_id).all()
        return [r[0] for r in rows]

    def _has_team_edit(self, user_id: int, dashboard_id: int) -> bool:
        membership = (
            self.db.query(TeamMember)
            .join(DashboardTeamShare, DashboardTeamShare.team_id == TeamMember.team_id)
            .filter(
                DashboardTeamShare.dashboard_id == dashboard_id,
                TeamMember.user_id == user_id,
                TeamMember.role.in_(["owner", "editor"]),
                DashboardTeamShare.permission == "editor",
            )
            .first()
        )
        return membership is not None

    def _can_access_dashboard(self, user_id: int, dashboard_id: int) -> bool:
        own = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.user_id == user_id).first()
        if own:
            return True
        team_ids = self._user_team_ids(user_id)
        if not team_ids:
            return False
        shared = (
            self.db.query(DashboardTeamShare)
            .filter(DashboardTeamShare.dashboard_id == dashboard_id, DashboardTeamShare.team_id.in_(team_ids))
            .first()
        )
        return shared is not None

    def save_dashboard(self, telegram_id: int, dataset_id: int, title: str, config: dict, dashboard_id: int | None = None) -> Dashboard:
        user = self._get_user(telegram_id)
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == user.id).first()
        if not dataset:
            raise AppException("Dataset not found", 404)

        if dashboard_id:
            dashboard = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
            if not dashboard:
                raise AppException("Dashboard not found", 404)
            if dashboard.user_id != user.id and not self._has_team_edit(user.id, dashboard_id):
                raise AppException("No permission to edit dashboard", 403)
            dashboard.title = title
            dashboard.config_json = json.dumps(config)
        else:
            dashboard = Dashboard(
                user_id=user.id,
                dataset_id=dataset_id,
                title=title,
                config_json=json.dumps(config),
            )
            self.db.add(dashboard)

        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def list_dashboards(self, telegram_id: int, dataset_id: int | None = None) -> list[Dashboard]:
        user = self._get_user(telegram_id)
        own_query = self.db.query(Dashboard).filter(Dashboard.user_id == user.id)
        if dataset_id is not None:
            own_query = own_query.filter(Dashboard.dataset_id == dataset_id)
        own_dashboards = own_query.all()

        team_ids = self._user_team_ids(user.id)
        if not team_ids:
            return sorted(own_dashboards, key=lambda d: d.updated_at, reverse=True)

        shared_query = (
            self.db.query(Dashboard)
            .join(DashboardTeamShare, DashboardTeamShare.dashboard_id == Dashboard.id)
            .filter(DashboardTeamShare.team_id.in_(team_ids), Dashboard.user_id != user.id)
        )
        if dataset_id is not None:
            shared_query = shared_query.filter(Dashboard.dataset_id == dataset_id)

        all_dashboards = {d.id: d for d in own_dashboards}
        for d in shared_query.all():
            all_dashboards[d.id] = d

        return sorted(all_dashboards.values(), key=lambda d: d.updated_at, reverse=True)

    def get_dashboard(self, telegram_id: int, dashboard_id: int) -> Dashboard:
        user = self._get_user(telegram_id)
        if not self._can_access_dashboard(user.id, dashboard_id):
            raise AppException("Dashboard not found", 404)
        dashboard = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
        if not dashboard:
            raise AppException("Dashboard not found", 404)
        return dashboard

    def share_dashboard(self, telegram_id: int, dashboard_id: int) -> Dashboard:
        dashboard = self.get_dashboard(telegram_id, dashboard_id)
        user = self._get_user(telegram_id)
        if dashboard.user_id != user.id:
            raise AppException("Only owner can create public link", 403)
        dashboard.share_token = secrets.token_urlsafe(24)
        dashboard.is_public = True
        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def share_dashboard_to_team(self, telegram_id: int, dashboard_id: int, team_id: int, permission: str) -> DashboardTeamShare:
        user = self._get_user(telegram_id)
        dashboard = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
        if not dashboard:
            raise AppException("Dashboard not found", 404)
        if dashboard.user_id != user.id:
            raise AppException("Only owner can share dashboard to team", 403)
        team_access = (
            self.db.query(TeamMember)
            .filter(TeamMember.team_id == team_id, TeamMember.user_id == user.id, TeamMember.role.in_(["owner", "editor"]))
            .first()
        )
        if not team_access:
            raise AppException("No permission to share to this team", 403)

        exists = (
            self.db.query(DashboardTeamShare)
            .filter(DashboardTeamShare.dashboard_id == dashboard_id, DashboardTeamShare.team_id == team_id)
            .first()
        )
        if exists:
            exists.permission = permission
            self.db.commit()
            self.db.refresh(exists)
            return exists

        share = DashboardTeamShare(dashboard_id=dashboard_id, team_id=team_id, permission=permission)
        self.db.add(share)
        self.db.commit()
        self.db.refresh(share)
        return share

    def list_comments(self, telegram_id: int, dashboard_id: int) -> list[DashboardComment]:
        user = self._get_user(telegram_id)
        if not self._can_access_dashboard(user.id, dashboard_id):
            raise AppException("Dashboard not found", 404)
        return (
            self.db.query(DashboardComment)
            .filter(DashboardComment.dashboard_id == dashboard_id)
            .order_by(DashboardComment.created_at.asc())
            .all()
        )

    def add_comment(self, telegram_id: int, dashboard_id: int, text: str) -> DashboardComment:
        user = self._get_user(telegram_id)
        if not self._can_access_dashboard(user.id, dashboard_id):
            raise AppException("Dashboard not found", 404)
        comment = DashboardComment(dashboard_id=dashboard_id, user_id=user.id, text=text)
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def get_public_dashboard(self, token: str) -> Dashboard:
        dashboard = self.db.query(Dashboard).filter(Dashboard.share_token == token, Dashboard.is_public.is_(True)).first()
        if not dashboard:
            raise AppException("Shared dashboard not found", 404)
        return dashboard
