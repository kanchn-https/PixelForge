from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(tags=["Sprites and Frames"])

# -- ASSETS & SPRITES --
@router.post("/assets", response_model=schemas.AssetResponse)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    new_asset = models.Asset(**asset.model_dump())
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@router.post("/sprites", response_model=schemas.SpriteResponse)
def create_sprite(sprite: schemas.SpriteCreate, db: Session = Depends(get_db)):
    # Make sure the parent asset exists
    asset = db.query(models.Asset).filter(models.Asset.id == sprite.asset_id).first()
    if not asset:
         raise HTTPException(status_code=404, detail="Asset not found. You must create an Asset before creating a Sprite.")
         
    new_sprite = models.Sprite(**sprite.model_dump())
    db.add(new_sprite)
    db.commit()
    db.refresh(new_sprite)
    return new_sprite

# -- FRAMES --
@router.post("/sprites/{sprite_id}/frames", response_model=schemas.SpriteFrameResponse)
def create_or_update_frame(sprite_id: int, frame: schemas.SpriteFrameCreate, db: Session = Depends(get_db)):
    """
    Saves the pixel matrix to PostgreSQL. 
    If Frame 1 already exists, it UPDATES it. If it doesn't, it INSERTS it.
    """
    # 1. Check if sprite exists
    sprite = db.query(models.Sprite).filter(models.Sprite.id == sprite_id).first()
    if not sprite:
        raise HTTPException(status_code=404, detail="Sprite not found. Cannot save frame.")
        
    # 2. Check if this exact frame already exists
    existing_frame = db.query(models.SpriteFrame).filter(
        models.SpriteFrame.sprite_id == sprite_id,
        models.SpriteFrame.frame_order == frame.frame_order
    ).first()
    
    if existing_frame:
        # It exists! UPDATE the pixel matrix.
        existing_frame.pixel_matrix = frame.pixel_matrix
        existing_frame.duration_ms = frame.duration_ms
        db.commit()
        db.refresh(existing_frame)
        return existing_frame
    else:
        # It's new! INSERT it.
        new_frame = models.SpriteFrame(sprite_id=sprite_id, **frame.model_dump())
        db.add(new_frame)
        db.commit()
        db.refresh(new_frame)
        return new_frame

@router.get("/sprites/{sprite_id}/frames", response_model=List[schemas.SpriteFrameResponse])
def get_frames(sprite_id: int, db: Session = Depends(get_db)):
    """
    Retrieves all frames for a given sprite, ordered by frame_order.
    """
    frames = db.query(models.SpriteFrame).filter(models.SpriteFrame.sprite_id == sprite_id).order_by(models.SpriteFrame.frame_order).all()
    return frames
