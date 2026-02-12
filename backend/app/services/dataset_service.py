import json
import logging
from pathlib import Path
from uuid import uuid4

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.entities import Dataset, User
from app.utils.middleware import AppException
from app.utils.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DatasetService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_user(self, telegram_id: int) -> User:
        user = self.db.query(User).filter(User.telegram_id == telegram_id).first()
        if user:
            return user
        user = User(telegram_id=telegram_id)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    async def upload_csv(self, telegram_id: int, file: UploadFile) -> Dataset:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise AppException("Only CSV files are allowed", 400)

        payload = await file.read()
        max_size = settings.max_file_size_mb * 1024 * 1024
        if len(payload) > max_size:
            raise AppException(f"File exceeds {settings.max_file_size_mb}MB", 400)

        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid4().hex}_{Path(file.filename).name}"
        file_path = upload_dir / safe_name
        file_path.write_bytes(payload)

        try:
            df = pd.read_csv(file_path)
        except Exception as exc:
            file_path.unlink(missing_ok=True)
            raise AppException(f"Invalid CSV file: {exc}", 400) from exc

        if len(df) > settings.max_rows:
            raise AppException(f"CSV row limit exceeded ({settings.max_rows})", 400)

        for col in df.columns:
            if df[col].dtype == "object":
                parsed = pd.to_datetime(df[col], errors="coerce", utc=False)
                if parsed.notna().sum() > max(5, len(df) * 0.5):
                    df[col] = parsed

        schema = []
        for col in df.columns:
            schema.append(
                {
                    "name": str(col),
                    "dtype": str(df[col].dtype),
                    "missing": int(df[col].isna().sum()),
                    "unique": int(df[col].nunique(dropna=True)),
                }
            )

        sample = json.loads(df.head(20).fillna("").to_json(orient="records", date_format="iso"))

        user = self.get_or_create_user(telegram_id)
        dataset = Dataset(
            user_id=user.id,
            name=file.filename,
            file_path=str(file_path),
            row_count=int(len(df)),
            column_count=int(len(df.columns)),
            schema_json=json.dumps(schema),
            sample_json=json.dumps(sample),
        )
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        logger.info("Dataset uploaded id=%s telegram_id=%s", dataset.id, telegram_id)
        return dataset

    def get_dataset(self, dataset_id: int, telegram_id: int | None = None) -> Dataset:
        query = self.db.query(Dataset).filter(Dataset.id == dataset_id)
        if telegram_id is not None:
            user = self.db.query(User).filter(User.telegram_id == telegram_id).first()
            if not user:
                raise AppException("User not found", 404)
            query = query.filter(Dataset.user_id == user.id)
        dataset = query.first()
        if not dataset:
            raise AppException("Dataset not found", 404)
        return dataset

    def load_dataframe(self, dataset: Dataset) -> pd.DataFrame:
        try:
            return pd.read_csv(dataset.file_path)
        except Exception as exc:
            raise AppException(f"Failed to load dataset: {exc}", 500) from exc
