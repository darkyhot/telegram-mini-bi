import json
from pathlib import Path

import httpx

from app.utils.middleware import AppException
from app.utils.settings import get_settings

settings = get_settings()
PROMPT_DIR = Path(__file__).resolve().parent / "prompts"


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.ollama_model

    async def generate_json(self, prompt: str) -> dict:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.2},
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
            if response.status_code != 200:
                raise AppException(f"Ollama request failed: {response.text}", 502)
            data = response.json()
            raw = data.get("response", "{}")
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                raise AppException("Ollama returned invalid JSON", 502) from exc


class PromptLoader:
    @staticmethod
    def load(name: str) -> str:
        file_path = PROMPT_DIR / name
        if not file_path.exists():
            raise AppException(f"Prompt file missing: {name}", 500)
        return file_path.read_text(encoding="utf-8")
