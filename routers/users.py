from fastapi import APIRouter
from typing import List
from schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.post("", response_model=UserResponse)
def create_user(user: UserCreate):
    pass


@router.get("", response_model=List[UserResponse])
def get_users():
    pass


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    pass


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user: UserUpdate):
    pass


@router.delete("/{user_id}")
def delete_user(user_id: int):
    pass
