"""PixelForge backend: static files, SQLite storage, OpenAI (ChatGPT) proxy, ZIP export.
Standard library only. Put OPENAI_API_KEY=... in a .env file, then run:  python3 server.py"""
import io, json, os, re, shutil, sqlite3, subprocess, tempfile, struct, time, urllib.error, urllib.request, zipfile, zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).parent
STATIC = ROOT / "static"
DB = ROOT / "pixelforge.db"
GRID = 16          # every sprite is GRID x GRID
EXPORT_SCALE = 4   # exported PNGs are 64x64 (nearest-neighbour)

env = ROOT / ".env"  # OPENAI_API_KEY=... (and optionally OPENAI_MODEL=...) go in a .env file
if env.exists():
    for line in env.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


class ApiError(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg


# ---------- database ----------
def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    return c


with db() as _c:
    _c.executescript("""
    create table if not exists projects(id integer primary key, name text not null, created text default current_timestamp);
    create table if not exists sprites(id integer primary key, project_id integer not null references projects(id) on delete cascade,
        name text not null, category text not null, filename text not null default '', pixels text not null);
    create table if not exists games(project_id integer primary key references projects(id) on delete cascade,
        html text, css text, js text, updated text default current_timestamp);""")


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_") or "sprite"


def clean_pixels(p):
    ok = isinstance(p, list) and len(p) == GRID * GRID and all(
        v == "" or (isinstance(v, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", v)) for v in p)
    if not ok:
        raise ApiError(400, f"Sprite must be a {GRID}x{GRID} grid of colours.")
    return p


def sprite_dict(r):
    return {"id": r["id"], "name": r["name"], "category": r["category"],
            "filename": r["filename"], "pixels": json.loads(r["pixels"])}


def project_sprites(c, pid):
    return [sprite_dict(r) for r in c.execute("select * from sprites where project_id=? order by id", (pid,))]


def need_project(c, pid):
    p = c.execute("select * from projects where id=?", (pid,)).fetchone()
    if not p:
        raise ApiError(404, "Project not found.")
    return p


# ---------- PNG (no Pillow needed) ----------
def png(pixels, scale=EXPORT_SCALE):
    n, raw = GRID * scale, bytearray()
    for y in range(n):
        raw.append(0)
        for x in range(n):
            c = pixels[(y // scale) * GRID + x // scale]
            raw += (bytes.fromhex(c[1:7]) + b"\xff") if c else b"\0\0\0\0"

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw))) + chunk(b"IEND", b""))


# ---------- AI (OpenAI / ChatGPT) ----------
SYSTEM = """You are the game engine of PixelForge. Build ONE complete, polished, fully playable 2D browser game using only HTML, CSS and vanilla JavaScript.
The user's description defines the core idea and the rules. Everything it leaves open is yours to design: level layout, speeds, difficulty balance, spawn logic, start hint, HUD, win/lose screens, simple shape-based feedback. You may add anything that makes the game better as long as it never contradicts the stated rules or the sprite roles.
Priorities, in order: 1) the game runs with zero errors and works from the first frame, 2) it is playable and looks presentable, 3) it follows the stated rules, 4) extra polish.
Asset rules:
- Use the provided sprites, loaded with new Image() from the exact paths given (for example assets/robot_1.png). Never redraw or invent character art with shapes. Shapes and text are only for HUD, effects and UI.
- Every sprite is a 16x16 pixel-art picture exported as a 64x64 PNG with transparency. Set ctx.imageSmoothingEnabled = false and draw them at sensible sizes (characters and items about 40-64px, platforms/ground tiled, a background sprite stretched or tiled over the whole canvas).
Engineering rules:
- index.html links style.css and script.js with relative paths and has one <canvas id="game" width="800" height="500">. Get it with document.getElementById("game"). No external libraries, fonts, CDNs, network requests, modules, alert/prompt/confirm, localStorage or audio files.
- Count an image as loaded on both onload and onerror, then start the loop, so one bad image can never leave a blank screen.
- Use requestAnimationFrame with delta time clamped to 0.05 seconds. Keep all game objects inside the canvas.
- Keyboard: store pressed keys from keydown/keyup (support arrows and WASD, space where useful) and call preventDefault for arrows and space. Support mouse or touch only when the description asks.
- Use rectangle (AABB) collision with slightly shrunk hitboxes. Nothing may spawn overlapping a hazard, and the game must never become unwinnable or stuck.
- Show a short controls hint on screen, plus score, lives, and win/lose messages when the rules involve them. After the game ends, Enter or Space restarts it cleanly with all state reset.
- Write complete, syntactically valid code: no placeholders, no TODOs, no truncated functions, no undefined variables. Before answering, mentally run the first frame and one full play-through. CSS: canvas width 100%, max-width 800px, height auto, centred, body margin 0, dark page background.
- Be compact: no explanatory comments, no needless abstractions. Use as much code as the game needs to be complete, typically 150-400 lines of JS.
- For follow-up changes, keep everything that works, apply the requested change, and return all three files in full.
Answer in EXACTLY this plain-text format, with no JSON and no markdown fences. Put only raw code under each marker: never write file names, labels or comments such as script.js or (script.js) in the code:
===SUMMARY===
one short sentence
===HTML===
(index.html)
===CSS===
(style.css)
===JS===
(script.js)"""

LABEL = re.compile(r"\A(?:[ \t]*[\[\(]?[ \t]*(?:index\.html|style\.css|script\.js)[ \t]*[\]\)]?[ \t]*:?[ \t]*(?:\n|\Z))+", re.I)


def clean_code(t):
    t = t.strip()
    for _ in range(2):  # fences and filename labels can appear in either order
        t = re.sub(r"\A```[\w-]*[ \t]*\n", "", t)
        t = re.sub(r"\n?```\s*\Z", "", t)
        t = LABEL.sub("", t.lstrip()).strip()
    return t


def parse_files(text):
    parts = re.split(r"^===(SUMMARY|HTML|CSS|JS)===[ \t]*$", text, flags=re.M)
    got = {parts[i].lower(): clean_code(parts[i + 1]) for i in range(1, len(parts) - 1, 2)}
    if not all(got.get(k) for k in ("html", "css", "js")):
        raise ApiError(502, "The AI returned an incomplete game. Try again or simplify the prompt.")
    got.setdefault("summary", "")
    return got


def call_ai(user):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise ApiError(500, "OPENAI_API_KEY is not set. Add it to the .env file and restart the server.")
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")  # read here so values from .env are used
    base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    body = json.dumps({"model": model, "max_completion_tokens": 14000,
                       "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]}).encode()
    headers = {"Content-Type": "application/json", "Authorization": "Bearer " + key, "User-Agent": "PixelForge/1.0"}
    last = None
    for attempt in range(3):  # retry busy or rate-limited answers a few times
        try:
            with urllib.request.urlopen(urllib.request.Request(base + "/chat/completions", body, headers), timeout=240) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode()
            if e.code == 401:
                raise ApiError(401, "OpenAI rejected the API key. Check OPENAI_API_KEY in .env, then restart the server.")
            if e.code == 429 and "insufficient_quota" in detail:
                raise ApiError(402, "Your OpenAI account has no credit left. Add credit at platform.openai.com/settings/organization/billing.")
            last = ApiError(e.code if e.code in (429, 500, 503) else 502, f"OpenAI returned an error ({e.code}): {detail[:200]}")
            if e.code not in (429, 500, 502, 503):
                raise last
        except Exception as e:
            last = ApiError(504, f"OpenAI did not answer in time: {e}")
        if attempt < 2:
            time.sleep(3 * (attempt + 1))
    else:
        raise last
    try:
        choice = data["choices"][0]
        text = choice["message"]["content"] or ""
    except Exception:
        raise ApiError(502, "OpenAI returned an empty answer. Try again.")
    if choice.get("finish_reason") == "length":
        raise ApiError(502, "The game was too large and got cut off. Ask for something simpler.")
    return parse_files(text)


def code_problems(out):
    p = []
    if not re.search(r"<canvas[^>]*id=[\"']game[\"']", out["html"]):
        p.append('index.html must contain <canvas id="game">')
    if not re.search(r"getElementById|querySelector", out["js"]):
        p.append("script.js never gets the canvas element")
    if "requestAnimationFrame" not in out["js"]:
        p.append("script.js has no requestAnimationFrame game loop")
    node = shutil.which("node")
    if node:
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
            f.write(out["js"])
        try:
            r = subprocess.run([node, "--check", f.name], capture_output=True, text=True, timeout=20)
            if r.returncode:
                lines = [l for l in r.stderr.splitlines() if "Error" in l]
                p.append("script.js has a syntax error: " + (lines[0] if lines else r.stderr[:150]))
        except Exception:
            pass
        finally:
            os.unlink(f.name)
    return p


def generate(b, pid):
    prompt = (b.get("prompt") or "").strip()
    if not prompt:
        raise ApiError(400, "Describe the game you want to build.")
    with db() as c:
        need_project(c, pid)
        sprites = {s["id"]: s for s in project_sprites(c, pid)}
        game = c.execute("select * from games where project_id=?", (pid,)).fetchone()
    has_game = bool(game and game["js"]) and not b.get("fresh")
    chosen = b.get("assets") or []
    if not chosen and not has_game:
        raise ApiError(400, "Choose at least one asset.")
    lines, required = [], []
    for a in chosen:
        s = sprites.get(int(a.get("id", 0)))
        if not s:
            raise ApiError(400, "A selected sprite no longer exists. Choose your assets again.")
        required.append(s["filename"])
        lines.append(f'- assets/{s["filename"]} | name: {s["name"]} | category: {s["category"]} | role: {a.get("role") or "not specified"}')
    user = ""
    if lines:
        user += "Sprites (64x64 PNG, transparent background, already in the assets folder):\n" + "\n".join(lines) + "\n\n"
    if has_game:
        user += (f"Current game files:\n[index.html]\n{game['html']}\n[style.css]\n{game['css']}\n[script.js]\n{game['js']}\n\n"
                 "Requested change:\n")
    else:
        user += "Game description:\n"
    user += prompt
    known, note = {s["filename"] for s in sprites.values()}, ""
    for attempt in range(2):
        out = call_ai(user + note)
        text = out["html"] + out["css"] + out["js"]
        used = set(re.findall(r"assets/([\w.\-]+\.png)", text))
        problems = [f"never uses assets/{f}" for f in required if f not in used]
        problems += [f"references unknown file assets/{f}" for f in sorted(used - known)]
        problems += code_problems(out)
        if not problems:
            break
        note = "\n\nYour previous answer was rejected: " + "; ".join(problems) + ". Fix this and return the full files again."
    else:
        raise ApiError(502, "The AI did not use the selected sprites correctly (" + "; ".join(problems) + "). Try again.")
    save_game(out, pid)
    return out


def save_game(b, pid):
    with db() as c:
        need_project(c, pid)
        c.execute("""insert into games(project_id,html,css,js) values(?,?,?,?)
            on conflict(project_id) do update set html=excluded.html, css=excluded.css, js=excluded.js, updated=current_timestamp""",
                  (pid, b.get("html", ""), b.get("css", ""), b.get("js", "")))
    return {"ok": True}


# ---------- export ----------
def export(_, pid):
    with db() as c:
        p = need_project(c, pid)
        g = c.execute("select * from games where project_id=?", (pid,)).fetchone()
        sprites = project_sprites(c, pid)
    if not g or not (g["js"] or "").strip():
        raise ApiError(400, "Generate a game before exporting.")
    html = g["html"]
    if "style.css" not in html:
        html = html.replace("</head>", '<link rel="stylesheet" href="style.css"></head>', 1)
    if "script.js" not in html:
        html = html.replace("</body>", '<script src="script.js"></script></body>', 1)
    used = set(re.findall(r"assets/([\w.\-]+\.png)", html + g["css"] + g["js"]))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html)
        z.writestr("style.css", g["css"])
        z.writestr("script.js", g["js"])
        for s in sprites:
            if s["filename"] in used:
                z.writestr("assets/" + s["filename"], png(s["pixels"]))
    return buf.getvalue(), "application/zip", {"Content-Disposition": f'attachment; filename="{slug(p["name"])}.zip"'}


# ---------- CRUD ----------
def list_projects(_):
    with db() as c:
        return [dict(r) for r in c.execute("select id, name from projects order by id")]


def create_project(b):
    name = (b.get("name") or "Untitled project").strip()[:60]
    with db() as c:
        return {"id": c.execute("insert into projects(name) values(?)", (name,)).lastrowid, "name": name}


def get_project(_, pid):
    with db() as c:
        p = need_project(c, pid)
        g = c.execute("select html, css, js from games where project_id=?", (pid,)).fetchone()
        return {"id": p["id"], "name": p["name"], "sprites": project_sprites(c, pid),
                "game": dict(g) if g else {"html": "", "css": "", "js": ""}}


def delete_project(_, pid):
    with db() as c:
        c.execute("delete from projects where id=?", (pid,))
    return {"ok": True}


def sprite_fields(b):
    name = (b.get("name") or "").strip()[:30]
    if not name:
        raise ApiError(400, "Give the sprite a name.")
    return name, (b.get("category") or "Other").strip()[:30], clean_pixels(b.get("pixels"))


def add_sprite(b, pid):
    name, cat, px = sprite_fields(b)
    with db() as c:
        need_project(c, pid)
        sid = c.execute("insert into sprites(project_id,name,category,pixels) values(?,?,?,?)",
                        (pid, name, cat, json.dumps(px))).lastrowid
        c.execute("update sprites set filename=? where id=?", (f"{slug(name)}_{sid}.png", sid))
        return sprite_dict(c.execute("select * from sprites where id=?", (sid,)).fetchone())


def update_sprite(b, sid):
    name, cat, px = sprite_fields(b)  # filename stays stable so existing games keep working
    with db() as c:
        c.execute("update sprites set name=?, category=?, pixels=? where id=?", (name, cat, json.dumps(px), sid))
        return sprite_dict(c.execute("select * from sprites where id=?", (sid,)).fetchone())


def delete_sprite(_, sid):
    with db() as c:
        c.execute("delete from sprites where id=?", (sid,))
    return {"ok": True}


# ---------- demo: Catch the Coin ----------
PAL = dict(k="#1d2433", g="#aab4c8", b="#4b8bf5", w="#ffffff", y="#ffd23f", o="#f08a24",
           r="#e5484d", d="#2f9e44", l="#6cc04a", n="#7a4a2a", s="#8fd3ff")


def art(rows):
    rows = [r.ljust(GRID, ".")[:GRID] for r in rows][:GRID]
    rows += ["." * GRID] * (GRID - len(rows))
    return [PAL.get(ch, "") for r in rows for ch in r]


DEMO = [
    ("Robot", "Character", "Player controlled with the left and right arrow keys; up arrow or space jumps", [
        "................", ".......rr.......", ".......kk.......", "....gggggggg....", "...gggggggggg...",
        "...gkwwggwwkg...", "...gkwkggkwkg...", "...gggggggggg...", "....gkkkkkkg....", ".....gggggg.....",
        "..bbbbbbbbbbbb..", ".gbbbyybbyybbbg.", ".gbbbbbbbbbbbbg.", "..bbbbbbbbbbbb..",
        "...kk......kk...", "..kkk......kkk.."]),
    ("Coin", "Collectible", "Collectible; touching it adds one to the score and a new coin appears somewhere reachable", [
        "................", "......kkkk......", "....kkyyyykk....", "...kyyyyyyyyk...", "..kyyywwyyyyyk..",
        "..kyywyyyyyyok..", "..kyyyyooyyyok..", "..kyyyyooyyyok..", "..kyyyyyyyyyok..", "..kyyyyyyyyook..",
        "...kyyyyyyook...", "....kkooookk....", ".....kkkkkk....."]),
    ("Monster", "Enemy", "Enemy that moves horizontally back and forth; touching it costs the player one life", [
        "................", "................", "......dddd......", "....dddddddd....", "...dddddddddd...",
        "..dddwwddwwddd..", "..dddwkddwkddd..", "..dddddddddddd..", "..dddkkkkkkddd..", "..dddkwkwkkddd..",
        "..dddddddddddd..", "...dd.dd.dd.dd.."]),
    ("Ground", "Platform", "Platform tiled along the bottom of the screen that the player walks on", [
        "l" * 16, "lllldllllldlllll", "d" * 16] + (["n" * 16, "nnnknnnnnnnknnnn", "n" * 16, "nnnnnnnknnnnnnnn"] * 4)[:13]),
    ("Background", "Background", "Game background filling the whole scene", ["s" * 16] * 2 + [
        "sswwwsssssswwsss", "swwwwwssssswwwws", "sswwwsssssssswss"] + ["s" * 16] * 11),
]
DEMO_PROMPT = ("Make a simple game called Catch the Coin. Move the Robot with the arrow keys. Collecting a Coin increases "
               "the score by one. The Monster moves horizontally. Touching the Monster reduces one life (start with 3 lives). "
               "Collecting 10 coins wins the game. Losing all lives ends the game.")


def demo(_):
    with db() as c:
        pid = c.execute("insert into projects(name) values('Catch the Coin')").lastrowid
    for name, cat, role, rows in DEMO:
        add_sprite({"name": name, "category": cat, "pixels": art(rows)}, pid)
    return {"project": {"id": pid, "name": "Catch the Coin"}, "prompt": DEMO_PROMPT,
            "roles": {name: role for name, _, role, _ in DEMO}}


# ---------- HTTP ----------
ROUTES = [
    ("GET", r"/api/projects", list_projects), ("POST", r"/api/projects", create_project),
    ("GET", r"/api/projects/(\d+)", get_project), ("DELETE", r"/api/projects/(\d+)", delete_project),
    ("POST", r"/api/projects/(\d+)/sprites", add_sprite), ("PUT", r"/api/sprites/(\d+)", update_sprite),
    ("DELETE", r"/api/sprites/(\d+)", delete_sprite), ("PUT", r"/api/projects/(\d+)/game", save_game),
    ("POST", r"/api/projects/(\d+)/generate", generate), ("GET", r"/api/projects/(\d+)/export", export),
    ("POST", r"/api/demo", demo),
]


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body, ctype="application/json", headers=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def handle_api(self, method, path):
        try:
            for m, pat, fn in ROUTES:
                hit = re.fullmatch(pat, path)
                if m == method and hit:
                    n = int(self.headers.get("Content-Length") or 0)
                    body = json.loads(self.rfile.read(n) or b"{}") if method in ("POST", "PUT") else {}
                    ids = [int(g) for g in hit.groups()]
                    res = fn(body, *ids) if method != "GET" or ids else fn(body)
                    if isinstance(res, tuple):
                        return self.reply(200, *res)
                    return self.reply(200, json.dumps(res).encode())
            raise ApiError(404, "Not found.")
        except ApiError as e:
            self.reply(e.code, json.dumps({"error": e.msg}).encode())
        except Exception as e:
            self.reply(500, json.dumps({"error": f"Server error: {e}"}).encode())

    def handle_any(self, method):
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            return self.handle_api(method, path)
        f = (STATIC / ("index.html" if path == "/" else path.lstrip("/"))).resolve()
        if method == "GET" and STATIC.resolve() in f.parents and f.is_file():
            ctype = {".html": "text/html", ".css": "text/css", ".js": "text/javascript"}.get(f.suffix, "application/octet-stream")
            return self.reply(200, f.read_bytes(), ctype + "; charset=utf-8" if f.suffix in (".html", ".css", ".js") else ctype)
        self.reply(404, b"Not found", "text/plain")

    do_GET = lambda self: self.handle_any("GET")
    do_POST = lambda self: self.handle_any("POST")
    do_PUT = lambda self: self.handle_any("PUT")
    do_DELETE = lambda self: self.handle_any("DELETE")

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"PixelForge running at http://localhost:{port}")
    if not os.environ.get("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY is not set. Generation will fail until it is.")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
