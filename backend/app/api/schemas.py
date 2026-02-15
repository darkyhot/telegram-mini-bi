from pydantic import BaseModel, Field


class DatasetOut(BaseModel):
    id: int
    name: str
    row_count: int
    column_count: int
    schema: list[dict]
    sample: list[dict]


class DatasetListItem(BaseModel):
    id: int
    name: str
    row_count: int
    column_count: int
    created_at: str


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


class AIHistoryItem(BaseModel):
    id: int
    question: str | None
    answer: str
    pandas_query: str | None
    chart_config: dict | None
    chart_data: list[dict] | None
    attempts: int
    created_at: str


class AIHistoryOut(BaseModel):
    profile: AIProfileOut | None
    queries: list[AIHistoryItem]


class ComparePeriodsIn(BaseModel):
    date_column: str
    value_column: str
    period: str = Field(default="month", pattern="^(day|week|month)$")


class ComparePeriodsOut(BaseModel):
    summary: str
    chart_config: dict
    chart_data: list[dict]


class NL2DashboardIn(BaseModel):
    prompt: str = Field(min_length=5, max_length=600)


class NL2DashboardWidget(BaseModel):
    title: str
    chart_config: dict
    chart_data: list[dict]


class NL2DashboardOut(BaseModel):
    summary: str
    widgets: list[NL2DashboardWidget]


class ExplainChartIn(BaseModel):
    question: str | None = None
    chart_config: dict
    chart_data: list[dict]


class ExplainChartOut(BaseModel):
    explanation: str


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
    created_at: str
    updated_at: str


class DashboardTeamShareIn(BaseModel):
    telegram_id: int
    team_id: int
    permission: str = Field(default="viewer", pattern="^(viewer|editor)$")


class DashboardCommentIn(BaseModel):
    telegram_id: int
    text: str = Field(min_length=1, max_length=1000)


class DashboardCommentOut(BaseModel):
    id: int
    dashboard_id: int
    user_telegram_id: int
    text: str
    created_at: str


class TeamCreateIn(BaseModel):
    telegram_id: int
    name: str = Field(min_length=2, max_length=255)


class TeamMemberAddIn(BaseModel):
    actor_telegram_id: int
    member_telegram_id: int
    role: str = Field(default="viewer", pattern="^(owner|editor|viewer)$")


class TeamOut(BaseModel):
    id: int
    name: str
    owner_telegram_id: int
    created_at: str


class TeamMemberOut(BaseModel):
    team_id: int
    member_telegram_id: int
    role: str
    created_at: str
