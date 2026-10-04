# PIXELFORGE: Technical Architecture & Project Documentation

PixelForge is a web-based pixel-art game creation ecosystem. It allows users to draw pixel art, define game objects, construct levels, set behavior rules, and play the resulting game directly in the browser without writing code.

---

## PART 1 — USER INTERFACE, PIXEL EDITOR AND DATA REPRESENTATION

### 1. What PixelForge Is
PixelForge solves the problem of high barriers to entry in game development. Typically, creating a game requires separate software for art (like Aseprite), logic (like Unity), and databases. PixelForge combines these into a single, accessible web platform. The user's goal is to rapidly prototype and play simple 2D pixel-art games directly in their browser.

### 2. Overall Frontend Architecture

**WHAT**: The frontend is a Single Page Application (SPA) built using React.
**WHY**: React's component-based architecture allows us to build complex, interactive UIs (like a matrix editor) that update efficiently.
**HOW**: State is managed at the component level. When state changes, React recalculates the UI and updates the DOM.
**PIXELFORGE EXAMPLE**: 
```text
User clicks a cell
        ↓
React UI triggers `onMouseDown`
        ↓
Component updates the `matrix` state array
        ↓
Canvas / Grid re-renders the new color
        ↓
User clicks "SAVE" -> `fetch()` sends data to the API to persist.
```

### 3. Existing Pixel Editor
The Pixel Editor is the core drawing tool in PixelForge.
*   **Canvas & Matrix**: The editor does not use free-form HTML5 Canvas painting. Instead, it uses a strict CSS Grid of HTML `div` elements representing a logical matrix.
*   **Logical vs Physical Resolution**: The logical resolution is fixed (e.g., 16x16 or 32x32 cells). The physical display simply stretches these cells using CSS (`width: 20px; height: 20px` per cell). Zooming only changes the CSS size, never the logical cell count.
*   **Drawing**: Uses Pencil (sets color) and Eraser (sets transparent).

### 4. Matrix Representation

**WHAT**: A matrix is a two-dimensional array (an array of arrays or a flat array with math).
**WHY**: Pixel art is inherently a grid. A matrix maps 1:1 to this grid.
**HOW**: Rows and columns represent `(y, x)` coordinates.
**PIXELFORGE EXAMPLE**:
```json
[
  ["transparent", "transparent", "#000000", "transparent"],
  ["transparent", "#FF0000", "#FF0000", "#000000"],
  ["#000000", "#FF0000", "#FF0000", "#000000"]
]
```
This represents a tiny 4x3 sprite. The array directly translates to colors rendered in the CSS Grid.

### 5. Pixel Editor Interaction Workflow
When a user draws:
1.  User clicks/drags over a pixel cell.
2.  The cell's `(x, y)` coordinate is passed to the handler.
3.  The React state matrix is cloned, and the color string at `matrix[y][x]` is updated.
4.  React triggers a re-render, instantly showing the new color.

### 6. Dashboard and Game Builder UI
*   **Dashboard**: The entry point. Manages projects. You can create a new project or open an existing one.
*   **Game Builder**: The heart of the ecosystem, organized into four clean tabs:
    *   **SCENES**: Manage different levels.
    *   **PLAYERS**: Define the user-controlled character.
    *   **OBJECTS**: Define items (coins, walls).
    *   **RULES**: Define visual logic (If X touches Y -> Do Z).

### WHAT AN EVALUATOR MAY ASK (PART 1)
**Q: Why did you use a matrix for pixels instead of Canvas 2D strokes?**
A: A matrix forces true pixel-art constraints. Canvas strokes are free-form and smooth, which breaks the blocky pixel aesthetic. A matrix also makes it extremely easy to serialize and save the exact pixel data to a database as JSON.

**Q: Why does zoom not change resolution?**
A: Because the logical matrix (the actual game data) must remain consistent. If a sprite is 16x16 pixels, zooming in just makes the monitor display it larger so the user can see better. It does not add more pixels to the sprite.

---

## PART 2 — APPLICATION LOGIC, BACKEND AND API WORKFLOW

*(Note: While originally planned for Node.js, the actual implementation uses **FastAPI (Python)**. The principles remain identical).*

### 1. Backend Architecture

**WHAT**: The backend is a Python FastAPI service.
**WHY**: It securely handles business logic and database connections, preventing the frontend from directly accessing the database.
**HOW**: It exposes HTTP endpoints. It receives requests, validates data, uses SQLAlchemy to talk to PostgreSQL, and returns JSON.
**PIXELFORGE EXAMPLE**:
```text
React Frontend
        ↓
HTTP Request (fetch)
        ↓
REST API (FastAPI Router)
        ↓
Python Business Logic / SQLAlchemy
        ↓
PostgreSQL Database
```

### 2. REST API
**WHAT**: Representational State Transfer. A standard for web communication.
**WHY**: It provides predictable URLs and standard HTTP methods.
**HOW**: 
*   `GET` retrieves data (e.g., load projects).
*   `POST` creates data (e.g., save a new sprite).
*   `PUT/PATCH` updates data.
*   `DELETE` removes data.

### 3. Project Workflow

**WHAT**: The process of creating a new project.
**WHY**: To establish a persistent container for sprites and scenes.
**HOW**:
1. User clicks `+ NEW PROJECT` and enters a title.
2. React calls `fetch('http://localhost:8000/projects/', { method: 'POST', body: { title } })`.
3. FastAPI receives the request.
4. SQLAlchemy generates an `INSERT INTO projects` SQL command.
5. PostgreSQL creates the row and returns the new ID.
6. FastAPI returns a `200 OK` JSON response.
7. React updates the Dashboard UI to show the new project.

### 4. API Endpoint Documentation (Currently Implemented)

| Endpoint | Method | Purpose | Database Operation | Caller |
| :--- | :--- | :--- | :--- | :--- |
| `/projects/` | GET | List all projects | `SELECT * FROM projects` | Dashboard |
| `/projects/` | POST | Create a project | `INSERT INTO projects` | Dashboard |
| `/projects/{id}` | GET | Get project details | `SELECT * WHERE id = ?` | Game Builder |
| `/sprites/{id}/frames` | POST | Save pixel art | `INSERT INTO sprite_frames` | Pixel Editor |

### 5. Error Handling
*   **Failed API Calls**: If the FastAPI server is offline, React `fetch()` throws an error, which we catch in a `try/catch` block and display a red Error Toast notification to the user.
*   **Database Errors**: If a foreign key fails (e.g., saving a sprite for a non-existent project), PostgreSQL rejects the transaction, FastAPI returns a `500` or `400` HTTP status, and the frontend alerts the user.

### WHAT AN EVALUATOR MAY ASK (PART 2)
**Q: How does the frontend communicate with the backend?**
A: Through HTTP requests using the browser's built-in `fetch` API. The frontend sends JSON data to specific URLs (endpoints) hosted by the FastAPI server, which processes it and replies with JSON.

**Q: What process executes the backend?**
A: The operating system runs the Python interpreter process, which executes the Uvicorn ASGI server. Uvicorn listens on an OS network port (8000) for incoming HTTP requests.

---

## PART 3 — DATABASE, GAME BUILDER AND GAME LOGIC

### 1. PostgreSQL Architecture

**WHAT**: PostgreSQL is a relational database management system (RDBMS).
**WHY**: PixelForge has highly structured data (Users own Projects, Projects own Sprites) that benefits from relational foreign keys and data integrity.
**HOW**: Data is stored in tables with rows and columns.
**PIXELFORGE EXAMPLE**: When a project is deleted, PostgreSQL's `ON DELETE CASCADE` constraint automatically deletes all scenes and sprites associated with it, preventing orphaned data.

### 2. Database Schema (Implemented)
*   **users**: `id`, `username`, `email`
*   **projects**: `id`, `title`, `user_id` (FK)
*   **sprites**: `id`, `project_id` (FK), `name`
*   **sprite_frames**: `id`, `sprite_id` (FK), `pixel_matrix` (JSONB)

### 3. Pixel Data Storage

**WHAT**: The `pixel_matrix` is stored as a `JSONB` column.
**WHY**: PostgreSQL handles JSON natively. Storing an array of arrays in a traditional SQL column is impossible without JSON.
**HOW**: The React matrix is converted to a JSON string and saved directly into the `sprite_frames` table.

### 4. Game Builder

The Game Builder UI translates user intent into game state.
*   **SCENES**: Defines the level grid (e.g., 128x64).
*   **PLAYERS / OBJECTS**: Instances of sprites placed at specific X/Y coordinates in the scene.
*   **RULES**: Visual conditional logic (`IF` condition `THEN` action).

### 5. Rules and Game Logic

**WHAT**: A rule system for non-programmers.
**WHY**: Users shouldn't write JavaScript to make a coin increase the score.
**HOW**: A rule consists of a Subject, Trigger, Target, and Action.
**PIXELFORGE EXAMPLE**: 
`IF [Player] [touches] [Coin] THEN [Add Score] [+1]`
This is stored in React state. During the game loop, the engine evaluates this condition mathematically (checking if bounding boxes overlap).

### 6. Complete Game Logic Example: Catch the Coin (Snake Engine)
*   **Scene**: The 128x64 background.
*   **Player**: A snake array initialized at `[{x:32, y:32}]` controlled by arrow keys.
*   **Object**: A coin placed at `(80, 32)`.
*   **Rule**: `IF Player touches Coin -> Add Score +1 -> Increase Length -> Respawn Coin`.
When played, the collision math detects the overlap, increments the state score, prevents the snake array from popping its tail (increasing length), and randomly changes the coin's X/Y coordinates.

### WHAT AN EVALUATOR MAY ASK (PART 3)
**Q: Why use PostgreSQL instead of saving everything to a file?**
A: PostgreSQL provides ACID transactions, concurrency control, and relational integrity. If two users edit the same project, the database manages the locks. It allows us to query specific data (like "get all sprites for project 5") instantly without loading massive files into memory.

**Q: How is a sprite stored?**
A: The matrix array is converted into a JSON string by the frontend, sent to the backend, and stored in a `JSONB` column in the `sprite_frames` table within PostgreSQL.

---

## PART 4 — OPERATING SYSTEM, GAME EXECUTION AND CHALLENGES

### 1. Application Startup & OS Involvement

**WHAT**: How the OS facilitates the app.
**WHY**: Software cannot interact with hardware without the OS.
**HOW**: 
1. The user opens Chrome. The OS allocates memory and CPU time to the Chrome process.
2. Chrome makes a network I/O request via the OS network stack to `localhost:5173`.
3. The Node.js frontend server reads HTML/JS from the hard drive (Disk I/O) and sends it back.
4. The Chrome V8 JavaScript engine compiles the React code into machine code, which the CPU executes to render the UI.

### 2. Threads, Concurrency, and I/O
*   **Browser (Frontend)**: JavaScript is single-threaded. It uses an Event Loop. When `fetch()` is called, JS delegates the network request to the browser's Web APIs, allowing the UI to remain responsive. When the response arrives, a callback is pushed to the queue.
*   **FastAPI (Backend)**: Uses asynchronous I/O (`async/await`). When waiting for PostgreSQL to save a sprite, the Python thread is freed up to handle other incoming HTTP requests, maximizing throughput.

### 3. Game Runtime Execution (The Snake Engine)

**WHAT**: The implemented game engine loop.
**WHY**: To make the created game playable.
**HOW**: The game uses a discrete tick-based loop (`setInterval` running every 150ms).
**PIXELFORGE EXAMPLE (When user clicks RUN GAME)**:
```text
RUN GAME
↓
React mounts GamePreview component (Memory allocated for snake array and coin position)
↓
`useEffect` registers keyboard event listeners (OS hardware interrupt -> Browser -> JS Event)
↓
`setInterval` starts. Every 150ms, the CPU executes the `moveSnake` function.
↓
Update coordinates based on current direction.
↓
Collision Check: Does Head X/Y == Coin X/Y?
↓
If True -> Execute Rule Action (Score + 1, Array length increases).
↓
React re-renders the Canvas (Memory -> GPU/Screen).
↓
Repeat next 150ms tick.
```

### 4. Memory Management
During the game, the OS allocates RAM to the browser process. The `snake` state is an array of objects `{x, y}` stored in the Heap memory. When the snake moves, old coordinate objects are discarded, and the browser's Garbage Collector automatically frees that memory back to the OS.

### 5. Important Challenges We Solved

**Problem**: *Logical vs Physical Canvas Size*
If a user draws a 16x16 sprite on a 1080p monitor, a literal 16x16 pixel square is too small to see or click. 
**Solution**: We decoupled logical and physical sizes. The matrix data remains 16x16. The CSS scales it up using `width: 32px` per cell. Zooming only changes the CSS size, preserving the underlying game data matrix.

**Problem**: *Game Engine Concurrency / Timing*
Using `requestAnimationFrame` for a grid-based Snake game caused the snake to move way too fast (60 frames per second), making it unplayable.
**Solution**: We transitioned the engine to a discrete tick-based architecture using `setInterval(moveSnake, 150)`. This forces the game logic to update exactly once every 150ms, resulting in classic grid-based movement while keeping the UI responsive.

### 6. What is Actually Implemented vs Planned

*   **Pixel Editor**: IMPLEMENTED. Functional matrix drawing, color selection, and database saving.
*   **Dashboard**: IMPLEMENTED. Connects to PostgreSQL to read/write projects.
*   **Game Builder (UI)**: IMPLEMENTED. Clean 4-tab interface (Scenes, Players, Objects, Rules).
*   **Game Runtime Engine**: IMPLEMENTED. A fully functional Snake game engine featuring array-based movement, keyboard I/O, collision detection, score tracking, and game over states.
*   **AI Integration**: PLANNED. Not currently implemented in the codebase.
*   **Multi-Scene Transitions**: PLANNED. The UI exists to define rules, but the engine currently runs a single continuous scene.

### WHAT AN EVALUATOR MAY ASK (PART 4)
**Q: What happens when the user clicks RUN?**
A: The frontend loads the game state variables into memory (RAM). It starts an interval timer. Every 150ms, the CPU calculates the new positions of the player, checks for mathematical coordinate overlaps (collisions), and updates the UI on the screen. 

**Q: What does the operating system actually do here?**
A: The OS is the conductor. It manages the processes running the browser, the Python backend, and the database. It handles the networking stack allowing them to talk to each other over `localhost`. It processes the hardware interrupts when you press an arrow key, routing that signal into the browser so our JavaScript can move the player.

**Q: What happens when two requests arrive together?**
A: FastAPI is asynchronous. The OS networking stack buffers the incoming TCP connections. FastAPI accepts them concurrently. If both requests need the database, PostgreSQL handles the concurrency, placing locks on rows if necessary to ensure data isn't corrupted, and resolving the queries safely.
