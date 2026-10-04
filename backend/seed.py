from app.database.database import SessionLocal, engine, Base
from app.models import models

# Ensure tables are created
Base.metadata.create_all(bind=engine)

def seed():
    db = SessionLocal()
    
    # Check if user 1 exists
    user = db.query(models.User).filter_by(id=1).first()
    if not user:
        user = models.User(id=1, username="testuser", email="test@test.com", password_hash="hash")
        db.add(user)
        db.commit()
        
    # Check if project 1 exists
    project = db.query(models.Project).filter_by(id=1).first()
    if not project:
        project = models.Project(id=1, user_id=1, title="Test Project")
        db.add(project)
        db.commit()

    # Check if asset 1 exists
    asset = db.query(models.Asset).filter_by(id=1).first()
    if not asset:
        asset = models.Asset(id=1, project_id=1, name="Test Asset", type="sprite")
        db.add(asset)
        db.commit()

    # Check if sprite 1 exists
    sprite = db.query(models.Sprite).filter_by(id=1).first()
    if not sprite:
        sprite = models.Sprite(id=1, asset_id=1)
        db.add(sprite)
        db.commit()

    print("Database seeded successfully with dummy data for Sprite ID 1!")
    db.close()

if __name__ == "__main__":
    seed()
