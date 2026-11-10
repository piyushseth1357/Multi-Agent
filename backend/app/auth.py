import jwt
from fastapi import Header, HTTPException, status
from pydantic import BaseModel
from .config import settings


class AuthenticatedUser(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"


async def get_current_user(
    authorization: str | None = Header(None),
    x_dev_user_id: str | None = Header(None),
) -> AuthenticatedUser:
    """
    Validates Supabase JWT from 'Authorization: Bearer <token>' header.
    In development mode without configured Supabase secrets, isolates users via X-Dev-User-Id.
    """
    if not authorization or not authorization.startswith("Bearer "):
        if settings.ENVIRONMENT == "development":
            dev_id = x_dev_user_id or "00000000-0000-0000-0000-000000000001"
            return AuthenticatedUser(id=dev_id, email=f"{dev_id}@local.test")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing Bearer Authorization header"}}
        )

    token = authorization.split(" ")[1]

    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            return AuthenticatedUser(
                id=payload.get("sub", ""),
                email=payload.get("email"),
                role=payload.get("role", "authenticated")
            )
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": {"code": "INVALID_TOKEN", "message": f"Token verification failed: {str(e)}"}}
            )
    else:
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            return AuthenticatedUser(
                id=unverified.get("sub", x_dev_user_id or "00000000-0000-0000-0000-000000000001"),
                email=unverified.get("email", "dev@local.test")
            )
        except Exception:
            dev_id = x_dev_user_id or "00000000-0000-0000-0000-000000000001"
            return AuthenticatedUser(id=dev_id, email="dev@local.test")
