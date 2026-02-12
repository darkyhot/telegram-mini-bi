from pydantic import BaseModel, Field


class DatasetOut(BaseModel):
    id: int
    name: str
    row_count: int
    column_count: int
    schema: list[dict]
    sample: list[dict]


class AIProfileOut(BaseModel):
    summary: str
    insights: list[str]
    suggested_visualizations: list[dict]


class AIQueryIn(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class AIQueryOut(BaseModel):
    answer: str
    pandas_query: str | None
    chart_config: dict
    chart_data: list[dict]


class DashboardIn(BaseModel):
    telegram_id: int
    dataset_id: int
    title: str = "Untitled Dashboard"
    config: dict
    dashboard_id: int | None = None


class DashboardOut(BaseModel):
    id: int
    title: str
    dataset_id: int
    config: dict
    share_token: str | None
    is_public: bool
