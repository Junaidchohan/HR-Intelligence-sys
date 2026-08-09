from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.core.security import get_current_user
from app.models import User, IntegrationSettings
from app.schemas import IntegrationSettingsUpdate, IntegrationSettingsOut
from app.core.encryption import encrypt_token, decrypt_token

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=IntegrationSettingsOut)
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only allow admin role to access settings
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Only admin can manage settings")
        
    settings = db.query(IntegrationSettings).filter(IntegrationSettings.user_id == current_user.id).first()
    if not settings:
        return IntegrationSettingsOut(
            github_token_configured=False,
            anthropic_api_key_configured=False,
            openai_api_key_configured=False
        )
        
    github_token = decrypt_token(settings.encrypted_github_token)
    anthropic = decrypt_token(settings.encrypted_anthropic_api_key)
    openai = decrypt_token(settings.encrypted_openai_api_key)
    
    return IntegrationSettingsOut(
        github_token_configured=bool(github_token),
        anthropic_api_key_configured=bool(anthropic),
        openai_api_key_configured=bool(openai)
    )

@router.post("", response_model=IntegrationSettingsOut)
def save_settings(payload: IntegrationSettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only allow admin role to save settings
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Only admin can manage settings")
        
    settings = db.query(IntegrationSettings).filter(IntegrationSettings.user_id == current_user.id).first()
    
    # Encrypt the incoming tokens
    enc_gh = encrypt_token(payload.github_token) if payload.github_token is not None else None
    enc_anthropic = encrypt_token(payload.anthropic_api_key) if payload.anthropic_api_key is not None else None
    enc_openai = encrypt_token(payload.openai_api_key) if payload.openai_api_key is not None else None
    
    if not settings:
        settings = IntegrationSettings(
            user_id=current_user.id,
            encrypted_github_token=enc_gh,
            encrypted_anthropic_api_key=enc_anthropic,
            encrypted_openai_api_key=enc_openai
        )
        db.add(settings)
    else:
        if payload.github_token is not None:
            settings.encrypted_github_token = enc_gh
        if payload.anthropic_api_key is not None:
            settings.encrypted_anthropic_api_key = enc_anthropic
        if payload.openai_api_key is not None:
            settings.encrypted_openai_api_key = enc_openai
            
    db.commit()
    db.refresh(settings)
    
    gh_token = decrypt_token(settings.encrypted_github_token)
    anthropic = decrypt_token(settings.encrypted_anthropic_api_key)
    openai = decrypt_token(settings.encrypted_openai_api_key)
    
    return IntegrationSettingsOut(
        github_token_configured=bool(gh_token),
        anthropic_api_key_configured=bool(anthropic),
        openai_api_key_configured=bool(openai)
    )
