from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

# We are defining classes that directly map to our SQL tables.
# This allows us to interact with the database using Python objects instead of raw SQL strings.

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship back to projects
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(100), nullable=False)
    width = Column(Integer, default=32)
    height = Column(Integer, default=32)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    scenes = relationship("Scene", back_populates="project", cascade="all, delete-orphan")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False) # e.g., 'sprite'
    file_path = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="assets")
    sprite = relationship("Sprite", back_populates="asset", uselist=False, cascade="all, delete-orphan")

class Sprite(Base):
    __tablename__ = "sprites"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"))
    width = Column(Integer, default=32)
    height = Column(Integer, default=32)
    pivot_x = Column(Integer, default=0)
    pivot_y = Column(Integer, default=0)

    asset = relationship("Asset", back_populates="sprite")
    frames = relationship("SpriteFrame", back_populates="sprite", cascade="all, delete-orphan")

class SpriteFrame(Base):
    __tablename__ = "sprite_frames"
    id = Column(Integer, primary_key=True, index=True)
    sprite_id = Column(Integer, ForeignKey("sprites.id", ondelete="CASCADE"))
    frame_order = Column(Integer, nullable=False)
    pixel_matrix = Column(JSONB, nullable=False) # Stores the drawn pixels!
    duration_ms = Column(Integer, default=100)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sprite = relationship("Sprite", back_populates="frames")

class Scene(Base):
    __tablename__ = "scenes"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    order_index = Column(Integer, default=0)
    tile_data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    project = relationship("Project", back_populates="scenes")
    game_objects = relationship("GameObject", back_populates="scene", cascade="all, delete-orphan")

class GameObject(Base):
    __tablename__ = "game_objects"
    id = Column(Integer, primary_key=True, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id", ondelete="CASCADE"))
    sprite_id = Column(Integer, ForeignKey("sprites.id", ondelete="SET NULL"))
    name = Column(String(100), nullable=False)
    x = Column(Integer, default=0)
    y = Column(Integer, default=0)
    scale = Column(Float, default=1.0)
    components = Column(JSONB)

    scene = relationship("Scene", back_populates="game_objects")
