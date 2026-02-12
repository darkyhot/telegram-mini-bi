import json
import re
from collections.abc import Sequence

import pandas as pd


class SafeQueryError(ValueError):
    pass


FORBIDDEN_TOKENS = {
    "__",
    "import",
    "lambda",
    "exec",
    "eval",
    "open",
    "os",
    "sys",
    "subprocess",
}

ALLOWED_OPERATORS = r"^[a-zA-Z0-9_\s\(\)\[\]\'\"\>\<\=\!\&\|\+\-\*\./,]+$"


def _validate_query_expression(expr: str, columns: Sequence[str]) -> None:
    if len(expr) > 500:
        raise SafeQueryError("Query too long")
    lowered = expr.lower()
    if any(token in lowered for token in FORBIDDEN_TOKENS):
        raise SafeQueryError("Query contains forbidden token")
    if not re.match(ALLOWED_OPERATORS, expr):
        raise SafeQueryError("Query contains unsupported characters")

    scrubbed = re.sub(r"'[^']*'|\"[^\"]*\"", "", expr)
    bad_identifiers = re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", scrubbed)
    allowed_words = {"and", "or", "not", "in", "True", "False", "None"}
    allowed_columns = set(columns)
    for identifier in bad_identifiers:
        if identifier in allowed_words or identifier in allowed_columns:
            continue
        raise SafeQueryError(f"Unknown identifier in query: {identifier}")


def sanitize_chart_config(config: dict[str, str | None], columns: Sequence[str]) -> dict[str, str | None]:
    allowed_types = {"bar", "line", "pie", "histogram"}
    chart_type = (config.get("type") or "bar").lower()
    if chart_type not in allowed_types:
        chart_type = "bar"

    x = config.get("x")
    y = config.get("y")
    agg = config.get("aggregation")

    if x not in columns:
        x = columns[0] if columns else None
    if y not in columns:
        numeric_fallback = next((c for c in columns if c != x), None)
        y = numeric_fallback
    if agg and agg not in {"sum", "mean", "count", "max", "min"}:
        agg = None

    return {"type": chart_type, "x": x, "y": y, "aggregation": agg}


def execute_safe_query(df: pd.DataFrame, pandas_query: str | None) -> pd.DataFrame:
    if not pandas_query:
        return df
    _validate_query_expression(pandas_query, list(df.columns))
    return df.query(pandas_query, engine="python")


def parse_json_payload(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise SafeQueryError("LLM output is not valid JSON")
        return json.loads(match.group(0))
