# auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.db.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, decode_token,
    validate_password_strength, is_token_inactive,
    refresh_token_activity,
)
from app.core.login_tracker import is_blocked, record_failure, record_success
from app.core.token_blacklist import blacklist_token, is_blacklisted
from app.core.rate_limit import limiter
from app.core.email_service import send_otp_email
from app.core.verification import generate_otp, verify_otp, has_pending_otp

router = APIRouter()
bearer = HTTPBearer(auto_error=False)

ALLOWED_EMAIL_DOMAINS = {"gmail.com", "outlook.com", "hotmail.com"}


# ── Helpers ───────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def validate_email_domain(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    return domain in ALLOWED_EMAIL_DOMAINS


def get_current_user(
    request:     Request,
    response:    Response,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db:          Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token requerido.")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado.")
    jti = payload.get("jti")
    if jti and is_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Sesión cerrada. Inicia sesión nuevamente.")
    if is_token_inactive(payload):
        if jti:
            blacklist_token(jti, payload.get("exp", 0))
        raise HTTPException(status_code=401, detail="Sesión expirada por inactividad.")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    new_token = refresh_token_activity(credentials.credentials)
    if new_token:
        response.headers["X-Refreshed-Token"] = new_token
    return user


# ── Registro ──────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(request: Request, db: Session = Depends(get_db)):
    try:
        body    = await request.json()
        user_in = UserCreate(**body)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Datos inválidos: {str(e)}")

    if not validate_email_domain(user_in.email):
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten correos de Gmail (@gmail.com) o Outlook (@outlook.com)."
        )

    valid, msg = validate_password_strength(user_in.password)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    raw_role   = getattr(user_in, 'role', 'client') or 'client'
    role_final = raw_role.lower() if raw_role.lower() in ['admin', 'client'] else 'client'

    new_user = User(
        id=uuid.uuid4(),
        email=user_in.email,
        display_name=user_in.display_name,
        password_hash=get_password_hash(user_in.password),
        role=role_final,
    )
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al guardar el usuario.")

    # Marcar como no verificado
    try:
        db.execute(text("UPDATE users SET is_verified = FALSE WHERE id = :id"), {"id": str(new_user.id)})
        db.commit()
    except Exception:
        pass

    # Generar OTP y enviar correo
    otp_code = generate_otp(new_user.email)
    send_otp_email(
        to_email=new_user.email,
        display_name=new_user.display_name or "Usuario",
        otp_code=otp_code,
    )

    return {
        "message":    "Cuenta creada. Revisa tu correo e ingresa el código de verificación.",
        "email":      new_user.email,
        "requires_verification": True,
    }


# ── Verificar OTP ─────────────────────────────────────────────

class VerifyOTPPayload(BaseModel):
    email: str
    code:  str

@router.post("/verify-otp")
def verify_otp_endpoint(payload: VerifyOTPPayload, db: Session = Depends(get_db)):
    """Verifica el código OTP de 6 dígitos ingresado por el usuario."""
    valid, msg = verify_otp(payload.email, payload.code)

    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Marcar cuenta como verificada
    try:
        db.execute(text("UPDATE users SET is_verified = TRUE WHERE email = :email"), {"email": payload.email})
        db.commit()
    except Exception:
        pass

    token = create_access_token(subject=user.email)
    return {
        "message":      "¡Cuenta verificada exitosamente!",
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "uid":         str(user.id),
            "email":       user.email,
            "displayName": user.display_name,
            "role":        user.role,
            "createdAt":   str(user.created_at),
        }
    }


# ── Reenviar OTP ──────────────────────────────────────────────

class ResendOTPPayload(BaseModel):
    email: str

@router.post("/resend-otp")
@limiter.limit("3/minute")
async def resend_otp(request: Request, payload: ResendOTPPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "Si el correo existe, recibirás un nuevo código."}

    otp_code = generate_otp(user.email)
    send_otp_email(
        to_email=user.email,
        display_name=user.display_name or "Usuario",
        otp_code=otp_code,
    )
    return {"message": "Nuevo código enviado. Revisa tu correo."}


# ── Login ─────────────────────────────────────────────────────

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, user_in: UserLogin, db: Session = Depends(get_db)):
    ip    = get_client_ip(request)
    email = user_in.email

    blocked, seconds = is_blocked(ip, email)
    if blocked:
        raise HTTPException(status_code=429,
            detail=f"Cuenta bloqueada temporalmente. Intenta en {seconds} segundos.",
            headers={"Retry-After": str(seconds)})

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        now_blocked, remaining = record_failure(ip, email)
        if now_blocked:
            raise HTTPException(status_code=429, detail="Demasiados intentos fallidos. Bloqueado 5 minutos.")
        raise HTTPException(status_code=401, detail=f"Credenciales incorrectas. {remaining} intento(s) restante(s).")

    # Verificar si la cuenta está verificada
    try:
        result = db.execute(text("SELECT is_verified FROM users WHERE email = :email"), {"email": email}).fetchone()
        if result and result[0] is False:
            raise HTTPException(status_code=403,
                detail="Cuenta no verificada. Revisa tu correo e ingresa el código de verificación.")
    except HTTPException:
        raise
    except Exception:
        pass

    record_success(ip, email)
    token = create_access_token(subject=user.email)
    return {
        "user": {
            "uid":         str(user.id),
            "email":       user.email,
            "displayName": user.display_name,
            "role":        user.role,
            "createdAt":   str(user.created_at),
        },
        "access_token": token,
        "token_type":   "bearer",
    }


# ── Logout ────────────────────────────────────────────────────

@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials:
        return {"message": "Sesión cerrada."}
    payload = decode_token(credentials.credentials)
    if payload:
        jti = payload.get("jti")
        exp = payload.get("exp", 0)
        if jti:
            blacklist_token(jti, exp)
    return {"message": "Sesión cerrada correctamente."}


# ── Perfil ────────────────────────────────────────────────────

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "uid":         str(current_user.id),
        "email":       current_user.email,
        "displayName": current_user.display_name,
        "role":        current_user.role,
        "createdAt":   str(current_user.created_at),
    }


# ── Actualizar perfil ─────────────────────────────────────────

class UpdateProfilePayload(BaseModel):
    display_name: Optional[str] = None

@router.patch("/me")
def update_me(
    payload:      UpdateProfilePayload,
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    if payload.display_name:
        current_user.display_name = payload.display_name.strip()[:150]
        db.commit()
        db.refresh(current_user)
    return {
        "uid":         str(current_user.id),
        "email":       current_user.email,
        "displayName": current_user.display_name,
        "role":        current_user.role,
        "createdAt":   str(current_user.created_at),
    }


# ── Cambiar contraseña ────────────────────────────────────────

class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password:     str

@router.post("/me/password")
def change_password(
    payload:      ChangePasswordPayload,
    credentials:  HTTPAuthorizationCredentials = Depends(bearer),
    current_user: User = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")
    valid, msg = validate_password_strength(payload.new_password)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser diferente a la actual.")
    if credentials:
        token_payload = decode_token(credentials.credentials)
        if token_payload:
            jti = token_payload.get("jti")
            exp = token_payload.get("exp", 0)
            if jti:
                blacklist_token(jti, exp)
    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Contraseña actualizada. Por favor inicia sesión nuevamente."}


# ── Recuperación de contraseña ────────────────────────────────

class ForgotPasswordPayload(BaseModel):
    email: str

class ResetPasswordPayload(BaseModel):
    email:        str
    code:         str
    new_password: str

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, payload: ForgotPasswordPayload, db: Session = Depends(get_db)):
    """Envía código OTP al correo para recuperar contraseña."""
    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()

    # Por seguridad siempre responder igual aunque no exista el usuario
    if user:
        otp_code = generate_otp(f"reset_{user.email}")
        send_otp_email(
            to_email=user.email,
            display_name=user.display_name or "Usuario",
            otp_code=otp_code,
        )

    return {"message": "Si el correo está registrado, recibirás un código para restablecer tu contraseña."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordPayload, db: Session = Depends(get_db)):
    """Verifica el OTP y actualiza la contraseña."""
    valid, msg = verify_otp(f"reset_{payload.email.strip().lower()}", payload.code)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    valid_pwd, pwd_msg = validate_password_strength(payload.new_password)
    if not valid_pwd:
        raise HTTPException(status_code=400, detail=pwd_msg)

    user = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Contraseña actualizada correctamente. Ya puedes iniciar sesión."}