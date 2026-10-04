from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The connection string tells SQLAlchemy where the PostgreSQL database is.
# We are connecting to the 'pixelforge' database on localhost.
SQLALCHEMY_DATABASE_URL = "postgresql://localhost/pixelforge"

# The 'engine' is responsible for actually talking to the database.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# A 'Session' is a temporary workspace for your queries. 
# We use this to run our queries and then close the connection when done.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 'Base' is the parent class for all our database models.
Base = declarative_base()

# This is a dependency function. It gives our API routes a database session 
# and makes sure it closes properly after the request is finished.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
