# PixelForge
Draw 16x16 sprites, describe a game, and let Gemini write it. Python standard library only; no pip install.

    export GEMINI_API_KEY=your_key      # or put GEMINI_API_KEY=... in a .env file
    python server.py                    # http://localhost:8000

Optional: `GEMINI_MODEL` (default `gemini-2.5-flash`), `PORT`.
Data lives in `pixelforge.db` (SQLite). The API key never leaves the server.
