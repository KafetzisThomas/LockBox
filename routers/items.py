from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from schemas import ItemResponse, ItemCreate, ItemUpdate
from models import Item
from database import get_db

router = APIRouter()


@router.get("", response_model=list[ItemResponse])
def get_items(user_id: int, db: Session = Depends(get_db)):
    return db.query(Item).filter(Item.user_id == user_id).all()


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = Item(
        name=item.name,
        encrypted_content=item.encrypted_content,
        user_id=item.user_id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.patch("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate):
    pass


@router.delete("/{item_id}")
def delete_item(item_id: int):
    pass
