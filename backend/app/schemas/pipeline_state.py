from pydantic import BaseModel, Field
from typing import Literal
from .agent_schemas import (
    IntentClassifierOutput,
    PlannerOutput,
    ArchitectOutput,
    DBDesignOutput,
    ApiDesignOutput,
    UIDesignOutput,
    CodeOutput,
    TestOutput,
    ReviewOutput,
    ChatResponseOutput,
    ImageGenerationOutput
)

class PipelineState(BaseModel):
    run_id: str
    user_prompt: str
    language: str = "auto"
    attachments_text: str = ""
    chat_history: list[dict] = Field(default_factory=list)

    # Adaptive routing
    intent: IntentClassifierOutput | None = None

    # Fast single-agent paths
    chat_response: ChatResponseOutput | None = None
    image_result: ImageGenerationOutput | None = None

    # Software Team Agent Artifacts (All Optional to support dynamic skipping!)
    plan: PlannerOutput | None = None
    architecture: ArchitectOutput | None = None
    db_design: DBDesignOutput | None = None
    api_design: ApiDesignOutput | None = None
    ui_design: UIDesignOutput | None = None
    backend: CodeOutput | None = None
    frontend: CodeOutput | None = None
    tests: TestOutput | None = None
    review: ReviewOutput | None = None

    # Execution Tracking
    review_loops: int = 0
    status: Literal["queued", "running", "done", "failed"] = "queued"
    error_message: str | None = None

    def get_token_optimized_context_for_agent(self, agent_name: str) -> dict:
        """
        Token Optimization: Returns ONLY the state slices required for the specific agent.
        Prevents context window bloat and saves up to 60% token usage.
        """
        base = {
            "user_prompt": self.user_prompt,
            "language": self.language,
            "attachments_text": self.attachments_text
        }

        if agent_name == "intent_classifier":
            return base

        if agent_name == "chat_assistant":
            return {**base, "recent_history": self.chat_history[-6:]}

        if agent_name == "image_generator":
            return base

        if agent_name == "planner":
            return {**base, "intent": self.intent.model_dump() if self.intent else None}

        if agent_name == "architect":
            return {"plan": self.plan.model_dump() if self.plan else None, "language": self.language}

        if agent_name == "db_designer":
            return {
                "plan": self.plan.model_dump() if self.plan else None,
                "architecture": self.architecture.model_dump() if self.architecture else None
            }

        if agent_name == "api_designer":
            return {
                "plan": self.plan.model_dump() if self.plan else None,
                "architecture": self.architecture.model_dump() if self.architecture else None
            }

        if agent_name == "ui_designer":
            return {
                "plan": self.plan.model_dump() if self.plan else None,
                "architecture": self.architecture.model_dump() if self.architecture else None
            }

        if agent_name == "backend_dev":
            return {
                "architecture": self.architecture.model_dump() if self.architecture else None,
                "db_design": self.db_design.model_dump() if self.db_design else None,
                "api_design": self.api_design.model_dump() if self.api_design else None,
            }

        if agent_name == "frontend_dev":
            return {
                "architecture": self.architecture.model_dump() if self.architecture else None,
                "api_design": self.api_design.model_dump() if self.api_design else None,
                "ui_design": self.ui_design.model_dump() if self.ui_design else None,
            }

        if agent_name == "tester":
            return {
                "plan": self.plan.model_dump() if self.plan else None,
                "api_design": self.api_design.model_dump() if self.api_design else None,
                "backend": self.backend.model_dump() if self.backend else None,
                "frontend": self.frontend.model_dump() if self.frontend else None,
            }

        if agent_name == "reviewer":
            return self.model_dump(exclude_none=True)

        return base
