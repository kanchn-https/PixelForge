# PixelForge

PixelForge is a pixel art and sprite animation creation workspace.

## Project Structure

```
PixelForge/
├── frontend/          # Web frontend (React / Next.js / Vite)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── editor/
│       ├── services/
│       └── utils/
├── backend/           # Python backend (FastAPI / Flask)
│   └── app/
│       ├── routes/
│       ├── models/
│       ├── schemas/
│       ├── services/
│       ├── database/
│       └── utils/
├── database/          # Database scripts and migrations
│   ├── schema.sql
│   ├── migrations/
│   └── seed.sql
└── docs/              # Project documentation
```

## Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/auth`: Authentication and user management
- `feature/pixel-editor`: Core pixel editing functionality
- `feature/sprite`: Sprite management and exporting
- `feature/animation`: Frame-by-frame animation engine
