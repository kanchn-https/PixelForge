from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import Base, engine
from app.routes import projects, sprites, scenes

# Create the database tables if they don't exist yet
# This reads the models we defined and creates SQL tables automatically if missing.
Base.metadata.create_all(bind=engine)

# Initialize the FastAPI application
# This is the core "process" that the OS will run and manage.
app = FastAPI(title="PixelForge API", description="Backend for the PixelForge Game Editor")

# Enable CORS (Cross-Origin Resource Sharing)
# This allows our React frontend (running on port 5173) to talk to our FastAPI backend (running on port 8000)
# Without this, the browser's security rules would block the requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this should be restricted to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect our Routers
app.include_router(projects.router)
app.include_router(sprites.router)
app.include_router(scenes.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the PixelForge Backend API!"}
