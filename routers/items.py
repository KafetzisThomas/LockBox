from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas import ItemResponse, ItemCreate, ItemUpdate
from models import Item
from database import get_db

router = APIRouter()


@router.get("", response_model=list[ItemResponse])
def get_items(user_id: int, db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.user_id == user_id).all()


@router.post("", response_model=ItemResponse)
def create_item(item: ItemCreate):
    pass


@router.patch("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate):
    pass


@router.delete("/{item_id}")
def delete_item(item_id: int):
    pass
