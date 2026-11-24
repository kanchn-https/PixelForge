# PixelForge

**Draw your own pixel art, describe a game in plain English, and let AI build a playable game that uses your art.**

---

## The core idea

Most AI game generators draw the characters themselves, so you get plain boxes, circles or emojis. PixelForge flips this: **you** create the sprites, and the AI builds the game around them.

1. You paint small 16×16 pixel sprites (a hero, an enemy, a coin, a background...).
2. You tell the AI what the game should be, for example *"collect stars and avoid bombs"*.
3. The AI writes a complete HTML5 game that draws **your exact sprites**.
4. You play it right away in the browser, tweak it with follow-up prompts, or export it as a ZIP.

Your prompt only defines the idea and the rules. The AI is free to design the details (layout, speed, difficulty, score screen), but it must use your sprites, and the game must run without errors.

---

## Features

- **Pixel Studio**: 16×16 sprite editor with a colour palette, pencil, eraser, undo/redo and zoom.
- **Projects**: each project keeps its own sprites and its own game.
- **AI Game Builder**: pick sprites, give each one a role, write a prompt, generate. Code is shown in an editable Monaco editor (`index.html`, `style.css`, `script.js`).
- **Game Preview**: play, pause, restart, stop and fullscreen in a sandboxed frame.
- **Checks before saving**: generated code must use your sprites and contain a canvas and a game loop. If Node.js is installed, the script is also syntax-checked. Failed checks trigger an automatic retry.
- **Export**: download the game as a ZIP with the code and your sprites as PNG files.
- **Demo**: one click loads a ready-made "Catch the Coin" project.

---

## Setup

### Requirements

- **Python 3.8 or newer** (no extra packages needed, standard library only)
- **An OpenAI API key** with some credit
- **A modern browser** (Chrome, Edge, Firefox, Safari)
- **Internet access** (for the OpenAI API and the code editor, which loads from a CDN)
- *Optional:* Node.js, which enables the automatic syntax check of generated code

### Steps

```bash
# 1. get the code
git clone https://github.com/kanchn-https/PixelForge
cd PixelForge

# 2. add your API key
printf "OPENAI_API_KEY=your-key-here\nOPENAI_MODEL=gpt-4o\n" > .env

# 3. start the server
python3 server.py
```

Then open **http://localhost:8000** in your browser.

On Windows, use `python server.py` and create the `.env` file with any text editor.

### Settings (in `.env`)

| Variable | Purpose | Default |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI key (required for generating games) | none |
| `OPENAI_MODEL` | Model used to write the game. Stronger models give better games | `gpt-4o-mini` |
| `OPENAI_BASE_URL` | Alternative OpenAI-compatible endpoint | `https://api.openai.com/v1` |
| `PORT` | Port the app runs on | `8000` |

> Never commit your `.env` file. It contains your secret key.

### Project structure

```
PixelForge/
├── server.py          # backend: web server, SQLite database, OpenAI calls, ZIP export
├── pixelforge.db      # SQLite database (created automatically on first run)
├── .env               # your API key (not committed)
└── static/
    ├── index.html     # app layout
    ├── style.css      # app styling
    └── app.js         # frontend logic (editor, builder, preview)
```

---

## Operating system and DBMS: what runs where

### Operating system level

PixelForge is **cross-platform**. It needs only Python 3 and a browser, so it runs on **macOS, Linux and Windows**. It was developed and tested on macOS.

- The OS runs the Python process (`server.py`) as a local web server on `127.0.0.1:8000`.
- The OS file system stores the database file and the `.env` file.
- Nothing is installed system-wide, and no separate database service is needed.

### DBMS level

PixelForge uses **SQLite**, an embedded, file-based relational DBMS, through Python's built-in `sqlite3` module.

- **Where it lives:** the data layer, as a single file (`pixelforge.db`) next to `server.py`. It runs inside the server process, with no database server to install or configure.
- **Schema:**

| Table | Holds | Notes |
|---|---|---|
| `projects` | project id, name, creation time | one row per project |
| `sprites` | name, category, file name, 16×16 colour grid (stored as JSON) | linked to a project with a foreign key |
| `games` | the game's `html`, `css` and `js` | one game per project |

- **Integrity:** foreign keys are switched on, so deleting a project automatically deletes its sprites and game (`ON DELETE CASCADE`).
- **Transparent pixels** are stored as empty strings; all other pixels are `#RRGGBB` hex colours.

### Architecture levels at a glance

| Level | Component | Technology |
|---|---|---|
| Presentation | Pixel Studio, Builder, Preview, in the browser | HTML, CSS, JavaScript, Monaco editor |
| Application | REST API, validation, prompt building, retry logic, ZIP export | Python (`http.server`) |
| Data | Projects, sprites, games | SQLite |
| External service | Game code generation | OpenAI Chat Completions API |
| Runtime | Sandboxed game frame | `<iframe sandbox="allow-scripts">` |

---

## User workflow

1. **Open a project.** Pick one from the dropdown, create a new one, or press **Load demo**.
2. **Draw a sprite.** In **Pixel Studio**, pick colours from the palette and paint on the 16×16 grid. Leave cells empty for transparency.
3. **Save it.** Give the sprite a name and category (Character, Enemy, Collectible, Platform, Background, Other) and click **Save sprite**. Repeat for each sprite your game needs.
4. **Choose assets.** In **AI Game Builder**, click **Choose assets**, tick your sprites, and type a short role for each, such as *"Player controlled with arrow keys"*.
5. **Write the prompt.** Describe the game and its rules, for example: *"The Hero catches falling Stars for points. Bombs cost a life. Collect 15 stars to win."*
6. **Generate.** Click **Generate game**. The server sends your prompt and sprite details to the AI, checks the result, and saves it. The code appears in the editor, where you can read or edit it.
7. **Play.** Open **Game Preview**. The game runs with your actual pixel art, and you can play, pause, restart or go fullscreen.
8. **Improve.** Go back to the Builder and write a change such as *"make the enemy slower"*. Leave **Start over** unticked so it edits the existing game. Tick it to build a new game from scratch.
9. **Export.** Click **Export game** to download a ZIP containing `index.html`, `style.css`, `script.js` and an `assets/` folder with your sprites as PNGs.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "OPENAI_API_KEY is not set" | Add the key to `.env` and restart the server |
| "OpenAI rejected the API key" | Check the key in `.env`, then restart |
| "Your OpenAI account has no credit left" | Add credit in your OpenAI billing settings |
| Code editor looks like a plain text box | The editor CDN was unreachable; the app still works |
| Game looks wrong after an update | Hard-refresh the browser (Cmd/Ctrl + Shift + R) |
| Game is buggy or too simple | Set `OPENAI_MODEL=gpt-4o` in `.env` and regenerate |

---

## Notes

- Sprites are always 16×16 and are exported as 64×64 PNGs with nearest-neighbour scaling, so they stay sharp.
- Generated games run in a sandbox with no access to the app or your data.
- Everything is stored locally in `pixelforge.db`; only your prompt, game code and sprite details are sent to OpenAI.
