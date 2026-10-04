from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

# --- PROJECTS ---
class ProjectBase(BaseModel):
    title: str
    width: int = 32
    height: int = 32

class ProjectCreate(ProjectBase):
    user_id: int

class ProjectResponse(ProjectBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# --- SPRITE FRAMES ---
class SpriteFrameBase(BaseModel):
    frame_order: int
    pixel_matrix: Any # We use Any to accept our JSON matrix (like [[0,0], [1,1]])
    duration_ms: int = 100

class SpriteFrameCreate(SpriteFrameBase):
    pass

class SpriteFrameResponse(SpriteFrameBase):
    id: int
    sprite_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- SPRITES ---
class SpriteBase(BaseModel):
    width: int = 32
    height: int = 32
    pivot_x: int = 0
    pivot_y: int = 0

class SpriteCreate(SpriteBase):
    asset_id: int

class SpriteResponse(SpriteBase):
    id: int
    asset_id: int
    frames: List[SpriteFrameResponse] = []
    
    class Config:
        from_attributes = True

# --- ASSETS ---
class AssetBase(BaseModel):
    name: str
    type: str # 'sprite', 'audio', etc.

class AssetCreate(AssetBase):
    project_id: int

class AssetResponse(AssetBase):
    id: int
    project_id: int
    created_at: datetime
    sprite: Optional[SpriteResponse] = None
    
    class Config:
        from_attributes = True

# --- GAME OBJECTS ---
class GameObjectBase(BaseModel):
    name: str
    x: int = 0
    y: int = 0
    scale: float = 1.0
    components: Optional[Any] = None

class GameObjectCreate(GameObjectBase):
    sprite_id: Optional[int] = None

class GameObjectResponse(GameObjectBase):
    id: int
    scene_id: int
    sprite_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- SCENES ---
class SceneBase(BaseModel):
    name: str
    order_index: int = 0
    tile_data: Optional[Any] = None

class SceneCreate(SceneBase):
    pass

class SceneResponse(SceneBase):
    id: int
    project_id: int
    created_at: datetime
    game_objects: List[GameObjectResponse] = []
    
    class Config:
        from_attributes = True
