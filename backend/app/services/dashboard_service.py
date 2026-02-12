import json
import secrets

from sqlalchemy.orm import Session

from app.models.entities import Dashboard, Dataset, User
from app.utils.middleware import AppException


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def _get_user(self, telegram_id: int) -> User:
        user = self.db.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            raise AppException("User not found", 404)
        return user

    def save_dashboard(self, telegram_id: int, dataset_id: int, title: str, config: dict, dashboard_id: int | None = None) -> Dashboard:
        user = self._get_user(telegram_id)
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == user.id).first()
        if not dataset:
            raise AppException("Dataset not found", 404)

        if dashboard_id:
            dashboard = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.user_id == user.id).first()
            if not dashboard:
                raise AppException("Dashboard not found", 404)
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

    def get_dashboard(self, telegram_id: int, dashboard_id: int) -> Dashboard:
        user = self._get_user(telegram_id)
        dashboard = self.db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.user_id == user.id).first()
        if not dashboard:
            raise AppException("Dashboard not found", 404)
        return dashboard

    def share_dashboard(self, telegram_id: int, dashboard_id: int) -> Dashboard:
        dashboard = self.get_dashboard(telegram_id, dashboard_id)
        dashboard.share_token = secrets.token_urlsafe(24)
        dashboard.is_public = True
        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def get_public_dashboard(self, token: str) -> Dashboard:
        dashboard = self.db.query(Dashboard).filter(Dashboard.share_token == token, Dashboard.is_public.is_(True)).first()
        if not dashboard:
            raise AppException("Shared dashboard not found", 404)
        return dashboard
