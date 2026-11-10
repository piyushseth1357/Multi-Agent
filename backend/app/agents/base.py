import json
import logging
from pathlib import Path
from typing import Type, TypeVar, Generic
from pydantic import BaseModel, ValidationError

from ..providers.router import router, ProviderResponse

logger = logging.getLogger("base_agent")
T = TypeVar("T", bound=BaseModel)

class BaseAgent(Generic[T]):
    def __init__(self, name: str, schema_class: Type[T], prompt_filename: str | None = None):
        self.name = name
        self.schema_class = schema_class
        self.prompt_filename = prompt_filename or f"{name}.md"
        self.prompts_dir = Path(__file__).parent.parent / "prompts"
        self.system_prompt = self._load_prompt()

    def _load_prompt(self) -> str:
        prompt_path = self.prompts_dir / self.prompt_filename
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8")
        # Fallback default prompt
        return f"You are the {self.name.replace('_', ' ').title()} AI agent in a professional software engineering team."

    async def execute(self, context: dict, force_provider: str | None = None) -> tuple[T, ProviderResponse]:
        """
        Executes agent logic, verifies JSON with Pydantic.
        On validation failure: retries ONCE with the error message appended.
        """
        user_prompt = (
            f"Given the following project context:\n"
            f"```json\n{json.dumps(context, indent=2)}\n```\n\n"
            f"Generate your output strictly conforming to the requested JSON schema. Do not output markdown codeblocks around the JSON if possible, only valid raw JSON."
        )

        schema_dict = self.schema_class.model_json_schema()

        # Attempt 1
        res = await router.generate_with_fallback(
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            json_schema=schema_dict,
            force_provider=force_provider
        )

        try:
            cleaned_content = self._clean_json(res.content)
            parsed_data = self.schema_class.model_validate_json(cleaned_content)
            return parsed_data, res
        except (ValidationError, json.JSONDecodeError) as e:
            logger.warning(f"Agent '{self.name}' attempt 1 produced invalid schema: {e}. Retrying once...")
            
            # Attempt 2 (Retry with error feedback)
            retry_user_prompt = (
                f"{user_prompt}\n\n"
                f"CRITICAL ERROR IN PREVIOUS ATTEMPT:\n{str(e)}\n\n"
                f"Fix the JSON so it strictly matches the schema."
            )
            retry_res = await router.generate_with_fallback(
                system_prompt=self.system_prompt,
                user_prompt=retry_user_prompt,
                json_schema=schema_dict,
                force_provider=force_provider
            )
            cleaned_retry = self._clean_json(retry_res.content)
            parsed_retry = self.schema_class.model_validate_json(cleaned_retry)
            return parsed_retry, retry_res

    def _clean_json(self, raw: str) -> str:
        """Strips markdown fences ```json ... ``` if model wrapped it."""
        s = raw.strip()
        if s.startswith("```json"):
            s = s[7:]
        elif s.startswith("```"):
            s = s[3:]
        if s.endswith("```"):
            s = s[:-3]
        return s.strip()
