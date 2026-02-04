from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from schemas import UserCreate, UserResponse, UserEmailUpdate, UserMasterPasswordUpdate, User2FAUpdate, User2FAVerify
from models import User
from database import get_db
import pyotp

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        email=user.email,
        auth_hash=user.auth_hash,
        kdf_salt=user.kdf_salt,
        wrapped_key=user.wrapped_key
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("", response_model=List[UserResponse])
async def get_users(email: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(User)
    if email:
        query = query.filter(User.email == email)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}/email", response_model=UserResponse)
async def update_user_email(user_id: int, user_update: UserEmailUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_update.email is not None and user_update.email != user.email:
        email_check = await db.execute(select(User).filter(User.email == user_update.email))
        existing_user = email_check.scalars().first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user.email = user_update.email
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


@router.patch("/{user_id}/master_password", response_model=UserResponse)
async def update_user_master_password(user_id: int, user_update: UserMasterPasswordUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.auth_hash = user_update.auth_hash
    user.kdf_salt = user_update.kdf_salt
    user.wrapped_key = user_update.wrapped_key

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/2fa", response_model=UserResponse)
async def update_user_2fa(user_id: int, user_update: User2FAUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.enable_2fa = user_update.enable_2fa
    if user_update.otp_secret:
        user.otp_secret = user_update.otp_secret
    elif not user.enable_2fa:
        user.otp_secret = None

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/verify_2fa")
async def verify_2fa(payload: User2FAVerify, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == payload.user_id))
    user = result.scalars().first()
    if not user or not user.otp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="2fa not enabled for this user")

    totp = pyotp.TOTP(user.otp_secret)
    if totp.verify(payload.otp_code):
        return {"status": "success"}
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP code")


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await db.delete(user)
    await db.commit()
