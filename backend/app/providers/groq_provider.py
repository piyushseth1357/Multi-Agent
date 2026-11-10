import time
from openai import AsyncOpenAI
from .base import BaseLLMProvider, ProviderResponse

class GroqProvider(BaseLLMProvider):
    def __init__(self, api_key: str, default_model: str = "llama-3.3-70b-versatile"):
        super().__init__(name="groq", default_model=default_model, api_key=api_key)
        self.client = AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key or "missing_key",
            timeout=60.0
        )

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

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        kwargs = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
        }

        # Request JSON mode when schema or structured output is required
        if json_schema:
            kwargs["response_format"] = {"type": "json_object"}

        response = await self.client.chat.completions.create(**kwargs)
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        usage = response.usage
        tokens_in = usage.prompt_tokens if usage else 0
        tokens_out = usage.completion_tokens if usage else 0
        content = response.choices[0].message.content or ""

        return ProviderResponse(
            content=content,
            provider="groq",
            model=target_model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms
        )
