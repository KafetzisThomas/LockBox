from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    auth_hash: str
    kdf_salt: str
    wrapped_key: str


class UserUpdate(UserBase):
    email: EmailStr | None = None
    auth_hash: str | None = None
    kdf_salt: str | None = None
    wrapped_key: str | None = None


class UserResponse(UserBase):
    id: int
    kdf_salt: str
    wrapped_key: str

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
    date_created: datetime

    model_config = ConfigDict(from_attributes=True)
