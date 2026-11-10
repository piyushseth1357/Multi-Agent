import json
import uuid
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..auth import get_current_user, AuthenticatedUser
from ..schemas.pipeline_state import PipelineState
from ..pipeline.orchestrator import orchestrator

router = APIRouter(prefix="/api/runs", tags=["Pipeline Runs"])

# In-memory runs repository (persists across active server session)
active_runs: dict[str, PipelineState] = {}

class CreateRunRequest(BaseModel):
    user_prompt: str
    conversation_id: str | None = None
    language: str = "auto"
    attachments_text: str = ""
    force_provider: str | None = None  # None for Auto Mode, or 'groq', 'gemini', 'openrouter'

class CreateRunResponse(BaseModel):
    run_id: str
    status: str

@router.post("", response_model=CreateRunResponse)
async def create_run(
    req: CreateRunRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Initializes a new autonomous multi-agent pipeline run.
    """
    run_id = str(uuid.uuid4())
    state = PipelineState(
        run_id=run_id,
        user_prompt=req.user_prompt,
        language=req.language,
        attachments_text=req.attachments_text
    )
    active_runs[run_id] = state

    return CreateRunResponse(run_id=run_id, status="queued")

@router.get("/{run_id}/stream")
async def stream_run(
    run_id: str,
    force_provider: str | None = None,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Streams live Server-Sent Events (SSE) as each agent starts, completes, skips, or reviews.
    """
    if run_id not in active_runs:
        raise HTTPException(status_code=404, detail="Run not found")

    state = active_runs[run_id]

    async def event_generator():
        try:
            async for event in orchestrator.run_pipeline(state, force_provider=force_provider):
                # Standard SSE format: "event: <name>\ndata: <json>\n\n"
                event_name = event.get("event", "message")
                payload = json.dumps(event.get("data", {}))
                yield f"event: {event_name}\ndata: {payload}\n\n"
                await asyncio.sleep(0.01)  # Yield execution to event loop
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/{run_id}")
async def get_run_status(
    run_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Retrieves full state snapshot for the specified run.
    """
    if run_id not in active_runs:
        raise HTTPException(status_code=404, detail="Run not found")
    return active_runs[run_id]
