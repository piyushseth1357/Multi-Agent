import asyncio
import logging
import httpx
from openai import RateLimitError

from ..config import settings
from .base import BaseLLMProvider, ProviderResponse
from .groq_provider import GroqProvider
from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider

logger = logging.getLogger("provider_router")

class ResilientProviderRouter:
    """
    Solves Kami #1: Prevents HTTP 429 collisions across free tier APIs via:
    1. Global Async Concurrency Semaphore (max 2 parallel calls)
    2. Exponential backoff retry on rate-limits
    3. Multi-tier automatic fallback (Groq -> Gemini -> OpenRouter)
    """
    def __init__(self):
        self.semaphore = asyncio.Semaphore(settings.CONCURRENCY_LIMIT)
        
        # Initialize providers from settings
        self.providers: list[BaseLLMProvider] = [
            GroqProvider(api_key=settings.GROQ_API_KEY, default_model=settings.GROQ_MODEL),
            GeminiProvider(api_key=settings.GEMINI_API_KEY, default_model=settings.GEMINI_MODEL),
            OpenRouterProvider(api_key=settings.OPENROUTER_API_KEY, default_model=settings.OPENROUTER_MODEL)
        ]

    async def generate_with_fallback(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict | None = None,
        force_provider: str | None = None
    ) -> ProviderResponse:
        async with self.semaphore:
            # If user explicitly selected a provider in manual mode
            active_providers = self.providers
            if force_provider:
                active_providers = [p for p in self.providers if p.name == force_provider] or self.providers

            errors_accumulated = []

            for provider in active_providers:
                if not provider.api_key:
                    logger.warning(f"Skipping {provider.name}: API key not configured in .env")
                    continue

                # Retry up to 3 times for transient 429s with exponential backoff
                backoff_delays = [1.0, 2.0, 4.0]
                
                for attempt, delay in enumerate(backoff_delays, start=1):
                    try:
                        logger.info(f"Attempting generation with {provider.name} (attempt {attempt})...")
                        response = await provider.generate(
                            system_prompt=system_prompt,
                            user_prompt=user_prompt,
                            json_schema=json_schema
                        )
                        return response

                    except (RateLimitError, httpx.HTTPStatusError) as e:
                        status_code = getattr(e, "status_code", None) or (e.response.status_code if hasattr(e, "response") else None)
                        
                        if status_code == 429:
                            logger.warning(f"{provider.name} returned 429 Rate Limit. Backing off for {delay}s...")
                            await asyncio.sleep(delay)
                            continue  # Retry same provider if attempts remain
                        elif status_code == 401:
                            logger.error(f"{provider.name} Authentication failed (401). Skipping provider.")
                            errors_accumulated.append(f"{provider.name}: 401 Invalid Key")
                            break
                        elif status_code == 404:
                            logger.error(f"{provider.name} Model not found (404). Skipping provider.")
                            errors_accumulated.append(f"{provider.name}: 404 Model Not Found")
                            break
                        else:
                            logger.warning(f"{provider.name} HTTP error {status_code}: {e}. Skipping to next provider.")
                            errors_accumulated.append(f"{provider.name}: HTTP {status_code}")
                            break

                    except Exception as e:
                        logger.warning(f"{provider.name} encountered error: {str(e)}. Fallback to next provider.")
                        errors_accumulated.append(f"{provider.name}: {str(e)}")
                        break

            # If all free providers fail
            all_errors_str = " | ".join(errors_accumulated)
            raise RuntimeError(
                f"All configured LLM providers failed. Diagnostic logs: [{all_errors_str}]. "
                "Please verify your free API keys in backend/.env"
            )

# Singleton router instance
router = ResilientProviderRouter()
