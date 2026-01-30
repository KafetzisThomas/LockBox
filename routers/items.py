from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from schemas import ItemResponse, ItemCreate, ItemUpdate
from models import Item
from database import get_db

router = APIRouter()


@router.get("", response_model=list[ItemResponse])
async def get_items(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).filter(Item.user_id == user_id))
    return result.scalars().all()


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(item: ItemCreate, db: AsyncSession = Depends(get_db)):
    db_item = Item(
        name=item.name,
        encrypted_content=item.encrypted_content,
        user_id=item.user_id
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item_update: ItemUpdate, user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).filter(Item.id == item_id, Item.user_id == user_id))
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item


@router.delete("/{item_id}")
async def delete_item(item_id: int, user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).filter(Item.id == item_id, Item.user_id == user_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    await db.delete(item)
    await db.commit()
    return {"status": "deleted", "id": item_id}
