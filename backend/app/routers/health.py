from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Public health check endpoint without auth or LLM calls.
    Used by uptime pingers to keep free-tier instances awake.
    """
    return {
        "status": "ok",
        "service": "AI Software Team Backend",
        "timestamp": datetime.utcnow().isoformat()
    }
