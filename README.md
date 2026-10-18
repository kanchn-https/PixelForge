# PixelForge

PixelForge is a local-first workspace for drawing pixel sprites and turning them into small, editable HTML Canvas games with Gemini.

## Requirements

- Python 3.10 or later (required by the current Google GenAI SDK)
- A modern browser
- Internet access for Monaco's CDN and Gemini game generation (the plain-text code editor remains available if Monaco cannot load)
- A Gemini API key to use AI generation

## Run locally

```sh
cd ~/Documents/Codex/pixel_forge
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
export GEMINI_API_KEY="your-key"
.venv/bin/python server.py
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). The key is read by the Python server and is never sent to the browser. The server uses Gemini's Interactions API with the `gemini-3.8-flash` model. Each request is independent and sets `store=false`; previous AI conversation history is not sent or chained. The current game file and selected project sprites are included as task input. Optionally set `PIXELFORGE_DB` to choose another SQLite database path. The default database is `data/pixelforge.sqlite3`.

Use Python 3.10 or later to create `.venv`; Python 3.9 cannot run the current Google GenAI SDK. On macOS, install a newer Python if needed, then select `.venv/bin/python` as the project interpreter.

Keep the server bound to its default loopback address. This MVP uses a single local creator profile, not accounts or remote hosting.

## Create, run, save, restore, and export

1. Select **New project** and name the project.
2. Draw on the pixel grid with pencil, eraser, flood fill, or eyedropper. Choose a palette/custom color, resize the grid, zoom in/out, and undo/redo. Name and save the sprite.
3. Select the sprite in **Include sprites**, describe a small game or a change to the current game, and press **Generate**. The server sends the prompt, selected color matrices, and current game file to Gemini; the generated single-file HTML appears in the editor and is versioned with the conversation.
4. Inspect and edit `game.html` in Monaco (or its local textarea fallback), then press **Run**. **Stop** terminates the current preview; **Restart** launches it again.
5. Changes autosave to a version after a short pause. **Save version** creates a checkpoint immediately. Use the version selector and **Restore** to recover an earlier version; restoration creates a new version rather than overwriting history.
6. **Export HTML** downloads the latest saved game as a self-contained `.html` file.

Projects, sprite matrices, AI conversations, and immutable game versions are stored in SQLite with foreign-key relationships. The local profile owns every project in this single-user MVP; API lookups are always scoped to that owner.

## Game execution and isolation

Generated HTML games execute in an iframe with only `allow-scripts`, served from a separate loopback origin (`localhost` on an ephemeral port) to encourage browser process isolation. A restrictive Content Security Policy blocks network connections, external resources, forms, and storage access. Preview code is limited to 256 KB, expires after 10 minutes, and is stopped after 60 seconds or immediately when **Stop** is pressed. JavaScript errors and unhandled promise rejections are relayed to the editor.

Browsers control process and memory scheduling; a web app cannot enforce a hard per-game operating-system memory quota. The separate origin, sandbox, CSP, code-size cap, and time limit are browser-level safeguards, not a substitute for running untrusted code in a dedicated OS container.

## Verification

Run the API and persistence tests:

```sh
cd ~/Documents/Codex/pixel_forge
.venv/bin/python -m unittest discover -s ../tests -v
```

The tests cover project access scoping, sprite matrix validation, version deduplication and restoration, HTML export, Gemini configuration errors, and sandboxed preview lifecycle.

The Python server handles the API and SQLite storage; game rendering runs in the browser because generated games are single-file HTML/JavaScript Canvas programs. The Google GenAI SDK and its HTTP client are listed in `requirements.txt`; no Node.js build step is required.
