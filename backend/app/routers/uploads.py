from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
import pymupdf
from docx import Document
import io

from ..auth import get_current_user, AuthenticatedUser

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx", ".png", ".jpg", ".jpeg", ".webp"}


@router.post("")
async def upload_attachment(
    file: UploadFile = File(...),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Uploads TXT, PDF, DOCX, or Image files and extracts plain text safely for Planner context.
    """
    filename = file.filename or "attachment"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "UNSUPPORTED_FILE_TYPE", "message": f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}},
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": "Max upload size is 10 MB"}},
        )

    extracted_text = ""
    try:
        if ext in {".txt", ".md"}:
            extracted_text = raw_bytes.decode("utf-8", errors="replace")
        elif ext == ".pdf":
            with pymupdf.open(stream=raw_bytes, filetype="pdf") as pdf:
                extracted_text = "\n".join(page.get_text() for page in pdf)
        elif ext == ".docx":
            doc = Document(io.BytesIO(raw_bytes))
            extracted_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        else:
            extracted_text = f"[Uploaded image reference: {filename}, size={len(raw_bytes)} bytes, mime={file.content_type}]"
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "EXTRACTION_FAILED", "message": f"Failed to parse file: {str(exc)}"}},
        )

    # Cap extracted text to prevent blowing up free-tier LLM context window
    max_chars = 12000
    truncated = len(extracted_text) > max_chars
    safe_text = extracted_text[:max_chars]

    return {
        "filename": filename,
        "mime_type": file.content_type or "application/octet-stream",
        "size_bytes": len(raw_bytes),
        "extracted_text": safe_text,
        "truncated": truncated,
        "uploaded_by": user.id,
    }
