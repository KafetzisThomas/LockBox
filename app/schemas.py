from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    auth_hash: str
    kdf_salt: str
    wrapped_key: str


class UserEmailUpdate(BaseModel):
    email: EmailStr


class UserMasterPasswordUpdate(BaseModel):
    auth_hash: str
    kdf_salt: str
    wrapped_key: str


class User2FAUpdate(BaseModel):
    enable_2fa: bool
    otp_secret: str | None = None


class User2FAVerify(BaseModel):
    otp_code: str
    user_id: int


class UserResponse(UserBase):
    id: int
    auth_hash: str
    kdf_salt: str
    wrapped_key: str
    enable_2fa: bool
    otp_secret: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ItemBase(BaseModel):
    name: str
    encrypted_content: str


class ItemCreate(ItemBase):
    user_id: int


class ItemUpdate(ItemBase):
    name: str | None = None
    encrypted_content: str | None = None


class ItemResponse(ItemBase):
    id: int
    user_id: int
    date_added: datetime
    last_modified: datetime

    model_config = ConfigDict(from_attributes=True)
