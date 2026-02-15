import json

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.api.schemas import DatasetListItem, DatasetOut
from app.models.database import get_db
from app.services.dataset_service import DatasetService

router = APIRouter()


@router.post("/upload", response_model=DatasetOut)
async def upload_dataset(
    telegram_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DatasetOut:
    service = DatasetService(db)
    dataset = await service.upload_csv(telegram_id=telegram_id, file=file)
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        schema=json.loads(dataset.schema_json),
        sample=json.loads(dataset.sample_json),
    )


@router.get("", response_model=list[DatasetListItem])
def list_datasets(telegram_id: int, db: Session = Depends(get_db)) -> list[DatasetListItem]:
    service = DatasetService(db)
    datasets = service.list_datasets(telegram_id)
    return [
        DatasetListItem(
            id=d.id,
            name=d.name,
            row_count=d.row_count,
            column_count=d.column_count,
            created_at=d.created_at.isoformat(),
        )
        for d in datasets
    ]


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, telegram_id: int, db: Session = Depends(get_db)) -> DatasetOut:
    service = DatasetService(db)
    dataset = service.get_dataset(dataset_id=dataset_id, telegram_id=telegram_id)
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
        schema=json.loads(dataset.schema_json),
        sample=json.loads(dataset.sample_json),
    )
