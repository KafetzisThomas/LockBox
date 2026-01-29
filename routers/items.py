from fastapi import APIRouter
from schemas import ItemResponse, ItemCreate, ItemUpdate

router = APIRouter()


@router.get("", response_model=list[ItemResponse])
def get_items():
    pass


@router.post("", response_model=ItemResponse)
def create_item(item: ItemCreate):
    pass


@router.patch("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate):
    pass


@router.delete("/{item_id}")
def delete_item(item_id: int):
    pass
