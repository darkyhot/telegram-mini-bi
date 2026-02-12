import json

from app.ai.ollama_client import OllamaClient, PromptLoader
from app.models.entities import Dataset
from app.services.dataset_service import DatasetService
from app.utils.middleware import AppException
from app.utils.safe_query import execute_safe_query, parse_json_payload, sanitize_chart_config


class AIAgentService:
    def __init__(self, dataset_service: DatasetService) -> None:
        self.dataset_service = dataset_service
        self.client = OllamaClient()

    async def profile_dataset(self, dataset: Dataset) -> dict:
        template = PromptLoader.load("data_profiler_prompt.txt")
        prompt = template.format(
            schema=dataset.schema_json,
            sample=dataset.sample_json,
            row_count=dataset.row_count,
            column_count=dataset.column_count,
        )
        output = await self.client.generate_json(prompt)
        summary = str(output.get("summary", "Dataset profile generated."))
        insights = output.get("insights", [])
        suggested = output.get("suggested_visualizations", [])

        if not isinstance(insights, list):
            insights = []
        if not isinstance(suggested, list):
            suggested = []

        return {
            "summary": summary,
            "insights": [str(i) for i in insights][:5],
            "suggested_visualizations": suggested[:5],
        }

    async def ask(self, dataset: Dataset, question: str) -> dict:
        df = self.dataset_service.load_dataframe(dataset)
        schema = json.loads(dataset.schema_json)
        template = PromptLoader.load("query_translator_prompt.txt")
        prompt = template.format(
            schema=json.dumps(schema),
            sample=dataset.sample_json,
            question=question,
        )

        raw = await self.client.generate_json(prompt)
        parsed = parse_json_payload(json.dumps(raw))

        pandas_query = parsed.get("pandas_query")
        if pandas_query is not None and not isinstance(pandas_query, str):
            raise AppException("Invalid pandas_query returned by model", 502)

        filtered = execute_safe_query(df, pandas_query)
        chart_config = sanitize_chart_config(parsed.get("chart_config", {}), list(df.columns))

        if chart_config["x"] is None:
            raise AppException("Unable to build chart: dataset has no columns", 400)

        x_col = chart_config["x"]
        y_col = chart_config["y"]
        agg = chart_config.get("aggregation")
        chart_type = chart_config["type"]

        if chart_type == "histogram":
            values = filtered[x_col].dropna()
            bins = min(20, max(5, int(values.nunique() / 2) if hasattr(values, "nunique") else 10))
            hist = values.value_counts(bins=bins).sort_index()
            chart_data = [{"x": str(idx), "y": float(val)} for idx, val in hist.items()]
        elif y_col and y_col in filtered.columns:
            series = filtered[[x_col, y_col]].dropna()
            if agg in {"sum", "mean", "count", "max", "min"}:
                grouped = series.groupby(x_col)[y_col].agg(agg).reset_index()
                chart_data = [{"x": str(r[x_col]), "y": float(r[y_col])} for _, r in grouped.head(200).iterrows()]
            else:
                chart_data = [{"x": str(r[x_col]), "y": float(r[y_col])} for _, r in series.head(200).iterrows()]
        else:
            counts = filtered[x_col].value_counts().head(50)
            chart_data = [{"x": str(idx), "y": int(val)} for idx, val in counts.items()]

        return {
            "answer": str(parsed.get("answer", "Analysis complete.")),
            "pandas_query": pandas_query,
            "chart_config": chart_config,
            "chart_data": chart_data,
        }
