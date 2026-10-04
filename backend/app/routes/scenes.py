from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.models import models
from app.schemas import schemas

# Notice the prefix! All routes here will automatically start with /projects/{project_id}/scenes
router = APIRouter(prefix="/projects/{project_id}/scenes", tags=["Scenes & Game Objects"])

# --- SCENES ---
@router.post("/", response_model=schemas.SceneResponse)
def create_scene(project_id: int, scene: schemas.SceneCreate, db: Session = Depends(get_db)):
    """
    Creates a new Scene (like 'Level 1') for a specific project.
    """
    # 1. Validation: Verify project exists
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Whoops! Cannot create a scene for a missing project.")
        
    # 2. Database Operation
    new_scene = models.Scene(project_id=project_id, **scene.model_dump())
    db.add(new_scene)
    db.commit()
    db.refresh(new_scene)
    return new_scene

@router.get("/", response_model=List[schemas.SceneResponse])
def get_scenes(project_id: int, db: Session = Depends(get_db)):
    """
    Gets all scenes for a project, ordered by their order_index.
    """
    return db.query(models.Scene).filter(models.Scene.project_id == project_id).order_by(models.Scene.order_index).all()

# --- GAME OBJECTS ---
@router.post("/{scene_id}/objects", response_model=schemas.GameObjectResponse)
def add_game_object(project_id: int, scene_id: int, game_object: schemas.GameObjectCreate, db: Session = Depends(get_db)):
    """
    Places a Game Object (like a Coin or Enemy) into a specific scene.
    Optionally attaches a sprite_id to it so it knows what to draw!
    """
    # 1. Validation: Verify scene exists and actually belongs to this project
    scene = db.query(models.Scene).filter(
        models.Scene.id == scene_id,
        models.Scene.project_id == project_id
    ).first()
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found in this project.")
        
    # 2. Database Operation
    new_object = models.GameObject(scene_id=scene_id, **game_object.model_dump())
    db.add(new_object)
    db.commit()
    db.refresh(new_object)
    
    return new_object
