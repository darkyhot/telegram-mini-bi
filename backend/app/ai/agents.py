import json
import logging

import pandas as pd

from app.ai.ollama_client import OllamaClient, PromptLoader
from app.models.entities import Dataset
from app.services.dataset_service import DatasetService
from app.utils.middleware import AppException
from app.utils.safe_query import execute_safe_query, parse_json_payload, sanitize_chart_config
from app.utils.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AIAgentService:
    def __init__(self, dataset_service: DatasetService) -> None:
        self.dataset_service = dataset_service
        self.client = OllamaClient()

    def _build_chart_data(self, df: pd.DataFrame, chart_config: dict[str, str | None]) -> list[dict]:
        x_col = chart_config["x"]
        y_col = chart_config["y"]
        agg = chart_config.get("aggregation")
        chart_type = chart_config["type"]

        if x_col is None:
            raise AppException("Unable to build chart: dataset has no columns", 400)

        if chart_type == "histogram":
            values = df[x_col].dropna()
            bins = min(20, max(5, int(values.nunique() / 2) if hasattr(values, "nunique") else 10))
            hist = values.value_counts(bins=bins).sort_index()
            return [{"x": str(idx), "y": float(val)} for idx, val in hist.items()]

        if y_col and y_col in df.columns:
            series = df[[x_col, y_col]].dropna()
            if agg in {"sum", "mean", "count", "max", "min"}:
                grouped = series.groupby(x_col)[y_col].agg(agg).reset_index()
                return [{"x": str(r[x_col]), "y": float(r[y_col])} for _, r in grouped.head(200).iterrows()]
            return [{"x": str(r[x_col]), "y": float(r[y_col])} for _, r in series.head(200).iterrows()]

        counts = df[x_col].value_counts().head(50)
        return [{"x": str(idx), "y": int(val)} for idx, val in counts.items()]

    async def profile_dataset(self, dataset: Dataset) -> dict:
        base_template = PromptLoader.load("data_profiler_prompt.txt")
        repair_template = PromptLoader.load("data_profiler_repair_prompt.txt")

        errors: list[str] = []
        last_output: dict | None = None

        for attempt in range(1, settings.llm_max_attempts + 1):
            if attempt == 1:
                prompt = base_template.format(
                    schema=dataset.schema_json,
                    sample=dataset.sample_json,
                    row_count=dataset.row_count,
                    column_count=dataset.column_count,
                )
            else:
                prompt = repair_template.format(
                    schema=dataset.schema_json,
                    sample=dataset.sample_json,
                    row_count=dataset.row_count,
                    column_count=dataset.column_count,
                    previous_output=json.dumps(last_output or {}),
                    error_log="\n".join(errors[-3:]),
                )

            try:
                output = await self.client.generate_json(prompt)
                last_output = output
                summary = str(output.get("summary", "Dataset profile generated."))
                insights = output.get("insights", [])
                suggested = output.get("suggested_visualizations", [])
                if not isinstance(insights, list) or len(insights) < 1:
                    raise AppException("Invalid profile insights format", 502)
                if not isinstance(suggested, list):
                    suggested = []

                return {
                    "summary": summary,
                    "insights": [str(i) for i in insights][:5],
                    "suggested_visualizations": suggested[:5],
                    "attempts": attempt,
                    "error_log": errors,
                }
            except Exception as exc:
                err = str(exc)
                errors.append(err)
                logger.warning("profile attempt=%s failed: %s", attempt, err)

        raise AppException(f"LLM profile failed after {settings.llm_max_attempts} attempts", 502)

    async def ask(self, dataset: Dataset, question: str) -> dict:
        df = self.dataset_service.load_dataframe(dataset)
        schema = json.loads(dataset.schema_json)

        base_template = PromptLoader.load("query_translator_prompt.txt")
        repair_template = PromptLoader.load("query_repair_prompt.txt")

        errors: list[str] = []
        last_output: dict | None = None

        for attempt in range(1, settings.llm_max_attempts + 1):
            if attempt == 1:
                prompt = base_template.format(
                    schema=json.dumps(schema),
                    sample=dataset.sample_json,
                    question=question,
                )
            else:
                prompt = repair_template.format(
                    schema=json.dumps(schema),
                    sample=dataset.sample_json,
                    question=question,
                    previous_output=json.dumps(last_output or {}),
                    error_log="\n".join(errors[-3:]),
                )

            try:
                raw = await self.client.generate_json(prompt)
                parsed = parse_json_payload(json.dumps(raw))
                last_output = parsed

                pandas_query = parsed.get("pandas_query")
                if pandas_query is not None and not isinstance(pandas_query, str):
                    raise AppException("Invalid pandas_query returned by model", 502)

                filtered = execute_safe_query(df, pandas_query)
                chart_config = sanitize_chart_config(parsed.get("chart_config", {}), list(df.columns))
                chart_data = self._build_chart_data(filtered, chart_config)

                if not chart_data:
                    raise AppException("Chart data is empty", 400)

                return {
                    "answer": str(parsed.get("answer", "Analysis complete.")),
                    "pandas_query": pandas_query,
                    "chart_config": chart_config,
                    "chart_data": chart_data,
                    "attempts": attempt,
                    "error_log": errors,
                }
            except Exception as exc:
                err = str(exc)
                errors.append(err)
                logger.warning("query attempt=%s failed: %s", attempt, err)

        raise AppException(f"LLM query failed after {settings.llm_max_attempts} attempts", 502)

    async def compare_periods(self, dataset: Dataset, date_column: str, value_column: str, period: str) -> dict:
        df = self.dataset_service.load_dataframe(dataset)
        if date_column not in df.columns or value_column not in df.columns:
            raise AppException("Invalid columns for period comparison", 400)

        dates = pd.to_datetime(df[date_column], errors="coerce")
        values = pd.to_numeric(df[value_column], errors="coerce")
        local = pd.DataFrame({"date": dates, "value": values}).dropna()
        if local.empty:
            raise AppException("Insufficient data for period comparison", 400)

        period_map = {"day": "D", "week": "W", "month": "M"}
        code = period_map.get(period, "M")

        grouped = local.groupby(local["date"].dt.to_period(code))["value"].sum().sort_index()
        tail = grouped.tail(12)
        prev = tail.shift(1)

        chart_data = [
            {
                "x": str(idx),
                "current": float(cur),
                "previous": float(prev.loc[idx]) if pd.notna(prev.loc[idx]) else None,
            }
            for idx, cur in tail.items()
        ]

        latest = tail.iloc[-1]
        before = prev.iloc[-1]
        if pd.notna(before) and before != 0:
            delta_pct = ((latest - before) / abs(before)) * 100
            summary = f"Change in latest {period}: {delta_pct:.1f}% versus previous period."
        else:
            summary = f"Period comparison prepared for column {value_column}."

        return {
            "summary": summary,
            "chart_config": {
                "type": "line",
                "x": date_column,
                "y": value_column,
                "comparison": True,
                "period": period,
            },
            "chart_data": chart_data,
        }

    async def generate_dashboard(self, dataset: Dataset, prompt_text: str) -> dict:
        prompt_template = PromptLoader.load("nl2dashboard_prompt.txt")
        prompt = prompt_template.format(
            schema=dataset.schema_json,
            sample=dataset.sample_json,
            prompt=prompt_text,
        )

        output = await self.client.generate_json(prompt)
        widgets_raw = output.get("widgets", []) if isinstance(output, dict) else []
        if not isinstance(widgets_raw, list) or not widgets_raw:
            widgets_raw = [
                {"title": "Key trend", "question": "Show the key trend in main metric"},
                {"title": "Top categories", "question": "Show top categories by contribution"},
            ]

        widgets: list[dict] = []
        for raw in widgets_raw[:4]:
            question = str(raw.get("question", "Show key chart"))
            title = str(raw.get("title", "AI Widget"))
            try:
                chart = await self.ask(dataset, question)
                widgets.append(
                    {
                        "title": title,
                        "chart_config": chart["chart_config"],
                        "chart_data": chart["chart_data"],
                    }
                )
            except Exception as exc:
                logger.warning("nl2dashboard widget failed: %s", exc)

        if not widgets:
            raise AppException("Failed to build widgets for dashboard", 502)

        return {
            "summary": "Dashboard generated from natural language prompt.",
            "widgets": widgets,
        }

    async def explain_chart(self, dataset: Dataset, chart_config: dict, chart_data: list[dict], question: str | None) -> dict:
        prompt_template = PromptLoader.load("explain_chart_prompt.txt")
        prompt = prompt_template.format(
            schema=dataset.schema_json,
            chart_config=json.dumps(chart_config),
            chart_data=json.dumps(chart_data[:120]),
            question=question or "Explain chart in plain Russian.",
        )
        output = await self.client.generate_json(prompt)
        explanation = str(output.get("explanation", "Chart shows trend and key changes in selected data."))
        return {"explanation": explanation}
