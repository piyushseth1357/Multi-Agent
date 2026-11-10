import time
import httpx
from .base import BaseLLMProvider, ProviderResponse

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, default_model: str = "gemini-2.5-flash"):
        super().__init__(name="gemini", default_model=default_model, api_key=api_key)
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict | None = None,
        model: str | None = None,
        temperature: float = 0.2
    ) -> ProviderResponse:
        start_time = time.perf_counter()
        target_model = model or self.default_model

        url = f"{self.base_url}/{target_model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER INPUT:\n{user_prompt}"}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
            }
        }

        if json_schema:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        candidate = data.get("candidates", [{}])[0]
        content = candidate.get("content", {}).get("parts", [{}])[0].get("text", "")
        usage = data.get("usageMetadata", {})
        tokens_in = usage.get("promptTokenCount", 0)
        tokens_out = usage.get("candidatesTokenCount", 0)

        return ProviderResponse(
            content=content,
            provider="gemini",
            model=target_model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms
        )
