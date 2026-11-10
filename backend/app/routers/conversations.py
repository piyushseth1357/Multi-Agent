import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from ..auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])

# In-memory storage for active conversations per user
conversations_db: dict[str, dict] = {}
messages_db: dict[str, list[dict]] = {}


class ConversationCreate(BaseModel):
    title: str = "New chat"
    language: str = "auto"


class ConversationUpdate(BaseModel):
    title: str


class MessageCreate(BaseModel):
    role: str
    content: str
    language: str | None = None


class ConversationImport(BaseModel):
    title: str | None = None
    language: str = "auto"
    messages: list[MessageCreate] = []


@router.get("")
async def list_conversations(
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Returns all non-deleted conversations belonging to the authenticated user."""
    user_convs = [
        c for c in conversations_db.values()
        if c["user_id"] == user.id and not c.get("is_deleted", False)
    ]
    user_convs.sort(key=lambda x: x["updated_at"], reverse=True)
    return user_convs


@router.post("")
async def create_conversation(
    payload: ConversationCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Initializes a new conversation thread."""
    conv_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    record = {
        "id": conv_id,
        "user_id": user.id,
        "title": payload.title,
        "language": payload.language,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now
    }
    conversations_db[conv_id] = record
    messages_db[conv_id] = []
    return record


@router.patch("/{conv_id}")
async def rename_conversation(
    conv_id: str,
    payload: ConversationUpdate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    if conv_id not in conversations_db or conversations_db[conv_id]["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversations_db[conv_id]["title"] = payload.title
    conversations_db[conv_id]["updated_at"] = datetime.utcnow().isoformat()
    return conversations_db[conv_id]


@router.delete("/{conv_id}")
async def soft_delete_conversation(
    conv_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    if conv_id not in conversations_db or conversations_db[conv_id]["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversations_db[conv_id]["is_deleted"] = True
    return {"status": "success", "message": "Conversation archived."}


@router.get("/{conv_id}/export")
async def export_conversation(
    conv_id: str,
    format: str = Query("json", pattern="^(json|md)$"),
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Exports a conversation thread as JSON or Markdown."""
    if conv_id not in conversations_db or conversations_db[conv_id]["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv = conversations_db[conv_id]
    msgs = messages_db.get(conv_id, [])

    if format == "md":
        lines = [f"# {conv['title']}\n", f"_Exported: {datetime.utcnow().isoformat()}_\n"]
        for m in msgs:
            lines.append(f"## {m['role'].upper()}\n{m['content']}\n")
        content = "\n".join(lines)
        return Response(
            content=content,
            media_type="text/markdown",
            headers={"Content-Disposition": f"attachment; filename=conversation_{conv_id[:8]}.md"}
        )

    payload = json.dumps({"conversation": conv, "messages": msgs}, indent=2)
    return Response(
        content=payload,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=conversation_{conv_id[:8]}.json"}
    )


@router.post("/import")
async def import_conversation(
    payload: ConversationImport,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Imports a JSON conversation payload into a new conversation for the current user."""
    conv_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    record = {
        "id": conv_id,
        "user_id": user.id,
        "title": payload.title or "Imported Conversation",
        "language": payload.language,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now
    }
    conversations_db[conv_id] = record
    messages_db[conv_id] = [
        {
            "id": str(uuid.uuid4()),
            "conversation_id": conv_id,
            "user_id": user.id,
            "role": m.role,
            "content": m.content,
            "language": m.language,
            "created_at": now
        }
        for m in payload.messages
    ]
    return record


@router.get("/{conv_id}/messages")
async def get_messages(
    conv_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    if conv_id not in conversations_db or conversations_db[conv_id]["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return messages_db.get(conv_id, [])


@router.post("/{conv_id}/messages")
async def post_message(
    conv_id: str,
    msg: MessageCreate,
    user: AuthenticatedUser = Depends(get_current_user)
):
    if conv_id not in conversations_db or conversations_db[conv_id]["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    new_msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conv_id,
        "user_id": user.id,
        "role": msg.role,
        "content": msg.content,
        "language": msg.language,
        "created_at": datetime.utcnow().isoformat()
    }
    messages_db[conv_id].append(new_msg)
    conversations_db[conv_id]["updated_at"] = datetime.utcnow().isoformat()
    return new_msg
