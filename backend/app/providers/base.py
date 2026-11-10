from abc import ABC, abstractmethod
from pydantic import BaseModel

class ProviderResponse(BaseModel):
    content: str
    provider: str
    model: str
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0

class BaseLLMProvider(ABC):
    def __init__(self, name: str, default_model: str, api_key: str):
        self.name = name
        self.default_model = default_model
        self.api_key = api_key

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict | None = None,
        model: str | None = None,
        temperature: float = 0.2
    ) -> ProviderResponse:
        """
        Executes generation against the LLM provider.
        Must return standard ProviderResponse or raise specific HTTP exceptions.
        """
        pass
