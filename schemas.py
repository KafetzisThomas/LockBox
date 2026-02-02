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


class UserResponse(UserBase):
    id: int
    auth_hash: str
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
    date_added: datetime

    model_config = ConfigDict(from_attributes=True)
