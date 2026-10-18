(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const paletteColors = ["#f4bd50", "#ee735c", "#cf6680", "#a88de8", "#668ce1", "#54c8b1", "#9bc777", "#f1e7cf", "#554e60", "#24242d"];
  const previewLimitMs = 60_000;
  const starterGame = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Styling -->
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #17202b; color: #f3f5f7; font: 14px system-ui, sans-serif; }
    main { width: min(94vw, 460px); padding: 20px; text-align: center; }
    h1 { margin: 0 0 5px; color: #ffcf69; font-size: 23px; }
    p { margin: 5px 0 13px; color: #c6cfdb; }
    canvas { width: 100%; aspect-ratio: 1.5; border: 2px solid #506177; border-radius: 9px; background: #222f3e; image-rendering: pixelated; }
    button { margin-top: 12px; padding: 8px 15px; border: 0; border-radius: 7px; background: #ffcf69; color: #272119; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <!-- Front end/interface -->
  <main>
    <h1>Little star collector</h1>
    <p>Move with ← → ↑ ↓ or WASD. Collect every star!</p>
    <canvas id="game" width="360" height="240" aria-label="Star collector game"></canvas>
    <p id="message" aria-live="polite"></p>
    <button id="restart" type="button">Restart game</button>
  </main>
  <script>
    // Setup
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const message = document.getElementById("message");
    const keys = new Set();
    // Game state
    let player, stars, collected, previousTime;
    // Game logic
    function resetGame() {
      player = { x: 28, y: 28, size: 18, speed: 125 };
      stars = [{ x: 115, y: 72 }, { x: 258, y: 55 }, { x: 187, y: 177 }, { x: 315, y: 208 }];
      collected = 0;
      previousTime = 0;
      message.textContent = "Stars: 0 / " + stars.length;
      requestAnimationFrame(gameLoop);
    }
    window.addEventListener("keydown", event => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    });
    window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
    document.getElementById("restart").addEventListener("click", resetGame);
    // Rendering
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#34475b";
      for (let x = 0; x < canvas.width; x += 24) for (let y = 0; y < canvas.height; y += 24) ctx.strokeRect(x, y, 24, 24);
      ctx.font = "19px system-ui";
      for (const star of stars) ctx.fillText("★", star.x, star.y);
      ctx.fillStyle = "#7be0ba";
      ctx.fillRect(Math.round(player.x), Math.round(player.y), player.size, player.size);
      ctx.fillStyle = "#233245";
      ctx.fillRect(player.x + 4, player.y + 4, 3, 3);
      ctx.fillRect(player.x + 11, player.y + 4, 3, 3);
      for (let i = stars.length - 1; i >= 0; i--) {
        if (Math.abs(player.x + 9 - stars[i].x) < 15 && Math.abs(player.y + 9 - stars[i].y) < 15) {
          stars.splice(i, 1);
          collected++;
          message.textContent = stars.length ? "Stars: " + collected + " / 4" : "You got them all! Nice work ✨";
        }
      }
    }
    // Game loop
    function gameLoop(time) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.04);
      previousTime = time;
      if (keys.has("arrowleft") || keys.has("a")) player.x -= player.speed * delta;
      if (keys.has("arrowright") || keys.has("d")) player.x += player.speed * delta;
      if (keys.has("arrowup") || keys.has("w")) player.y -= player.speed * delta;
      if (keys.has("arrowdown") || keys.has("s")) player.y += player.speed * delta;
      player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
      render();
      requestAnimationFrame(gameLoop);
    }
    resetGame();
  <\/script>
</body>
</html>`;

  const state = {
    project: null,
    projects: [],
    assets: [],
    versions: [],
    conversations: [],
    code: "",
    codeDirty: false,
    activeTool: "pencil",
    selectedColor: "#f4bd50",
    selectedColorMode: "color",
    matrix: createMatrix(16, 16),
    width: 16,
    height: 16,
    zoom: 100,
    undoStack: [],
    redoStack: [],
    drawing: false,
    currentStrokeChanged: false,
    monaco: null,
    suppressEditorEvents: false,
    autosaveTimer: null,
    saveQueue: Promise.resolve(),
    previewTimer: null,
    previewToken: null,
    previewRunId: 0,
    previewResize: null,
    toastTimer: null,
  };

  function createMatrix(width, height) {
    return Array.from({ length: height }, () => Array(width).fill(null));
  }

  // Sends a request to the local API, parses its response, and throws for HTTP errors.
  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
    const data = response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : await response.text();
    if (!response.ok) throw new Error(data && typeof data === "object" ? data.error || "Request failed." : "Request failed.");
    return data;
  }

  function showToast(message, isError = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
  }

  function setSaveStatus(text, mode = "") {
    const status = $("#save-status");
    status.textContent = text;
    status.classList.toggle("is-saving", mode === "saving");
    status.classList.toggle("is-saved", mode === "saved");
  }

  function setWorkspaceEnabled(enabled) {
    $("#project-select").disabled = !enabled;
    $("#save-button").disabled = !enabled;
    $("#export-button").disabled = !enabled;
    $("#sprite-workspace").classList.toggle("is-disabled", !enabled);
    $("#run-button").disabled = !enabled;
    $("#restart-button").disabled = !enabled;
    $("#game-prompt").disabled = !enabled;
    $("#send-prompt").disabled = !enabled;
    $("#editor-empty").hidden = enabled;
    $("#code-fallback").hidden = !enabled || Boolean(state.monaco);
    $("#monaco-editor").style.display = enabled && state.monaco ? "block" : "none";
    if (!enabled) {
      $("#stop-button").disabled = true;
      $("#export-button").disabled = true;
    }
  }

  function setEditorValue(value) {
    state.suppressEditorEvents = true;
    state.code = value;
    state.codeDirty = false;
    if (state.monaco) state.monaco.setValue(value);
    else $("#code-fallback").value = value;
    state.suppressEditorEvents = false;
  }

  function updateCode(value) {
    state.code = value;
    state.codeDirty = true;
    setSaveStatus("Unsaved changes");
    clearTimeout(state.autosaveTimer);
    if (state.project) state.autosaveTimer = setTimeout(() => saveVersion(true), 8000);
  }

  function initializeMonaco() {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js";
    script.async = true;
    script.onload = () => {
      if (!window.require) return;
      window.require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } });
      window.require(["vs/editor/editor.main"], () => {
        const host = $("#monaco-editor");
        state.monaco = window.monaco.editor.create(host, {
          value: state.code,
          language: "html",
          theme: "vs-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 12,
          lineHeight: 19,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          padding: { top: 10 },
          suggest: { showWords: false },
        });
        state.monaco.onDidChangeModelContent(() => {
          if (!state.suppressEditorEvents) updateCode(state.monaco.getValue());
        });
        host.style.display = state.project ? "block" : "none";
        $("#code-fallback").hidden = true;
        if (state.project) state.monaco.setValue(state.code);
      }, () => {
        $("#editor-mode").textContent = "Text editor fallback";
      });
    };
    script.onerror = () => { $("#editor-mode").textContent = "Text editor fallback"; };
    document.head.append(script);
  }

  function renderPalette() {
    const palette = $("#palette");
    palette.replaceChildren();
    for (const color of paletteColors) {
      const button = document.createElement("button");
      button.type = "button";
      button.title = color;
      button.setAttribute("aria-label", "Select " + color);
      button.style.background = color;
      button.addEventListener("click", () => setDrawingColor(color));
      palette.append(button);
    }
  }

  function setDrawingColor(color) {
    state.selectedColor = color;
    state.selectedColorMode = color ? "color" : "transparent";
    if (color) $("#color-picker").value = color;
  }

  function pixelColor() {
    return state.activeTool === "eraser" || state.selectedColorMode === "transparent" ? null : state.selectedColor;
  }

  function renderCanvas() {
    const canvas = $("#pixel-canvas");
    if (canvas.width !== state.width || canvas.height !== state.height) {
      canvas.width = state.width;
      canvas.height = state.height;
    }
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, state.width, state.height);
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const color = state.matrix[y][x];
        if (color) {
          context.fillStyle = color;
          context.fillRect(x, y, 1, 1);
        }
      }
    }
    context.beginPath();
    for (let x = 0; x <= state.width; x++) {
      context.moveTo(x, 0);
      context.lineTo(x, state.height);
    }
    for (let y = 0; y <= state.height; y++) {
      context.moveTo(0, y);
      context.lineTo(state.width, y);
    }
    const visible = Math.min(460, Math.max(128, 256 * (state.zoom / 100)));
    context.strokeStyle = "rgba(32, 31, 41, .48)";
    context.lineWidth = state.width / visible;
    context.stroke();
    $("#canvas-dimensions").textContent = state.width + " × " + state.height;
    $("#zoom-label").textContent = state.zoom + "%";
    $("#pixel-canvas").style.setProperty("--canvas-display-size", visible + "px");
  }

  function snapshot() {
    return { width: state.width, height: state.height, matrix: state.matrix.map((row) => row.slice()) };
  }

  function pushUndo() {
    state.undoStack.push(snapshot());
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = [];
  }

  function restoreSnapshot(item) {
    state.width = item.width;
    state.height = item.height;
    state.matrix = item.matrix.map((row) => row.slice());
    $("#canvas-size").value = String(item.width);
    $("#undo-button").disabled = state.undoStack.length === 0;
    $("#redo-button").disabled = state.redoStack.length === 0;
    renderCanvas();
  }

  // Moves the current drawing between history stacks before restoring the selected snapshot.
  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push(snapshot());
    restoreSnapshot(state.undoStack.pop());
  }

  // Restores the next drawing state and keeps the current state available to undo.
  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push(snapshot());
    restoreSnapshot(state.redoStack.pop());
  }

  function coordinates(event) {
    const rect = $("#pixel-canvas").getBoundingClientRect();
    return {
      x: Math.min(state.width - 1, Math.max(0, Math.floor((event.clientX - rect.left) * state.width / rect.width))),
      y: Math.min(state.height - 1, Math.max(0, Math.floor((event.clientY - rect.top) * state.height / rect.height))),
    };
  }

  function paintAt(x, y) {
    const color = pixelColor();
    if (state.matrix[y][x] === color) return;
    state.matrix[y][x] = color;
    state.currentStrokeChanged = true;
    renderCanvas();
  }

  function fillAt(x, y) {
    const target = state.matrix[y][x];
    const replacement = pixelColor();
    if (target === replacement) return false;
    const queue = [[x, y]];
    while (queue.length) {
      const [px, py] = queue.pop();
      if (px < 0 || py < 0 || px >= state.width || py >= state.height || state.matrix[py][px] !== target) continue;
      state.matrix[py][px] = replacement;
      queue.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    renderCanvas();
    return true;
  }

  function startStroke(event) {
    if (!state.project) return;
    event.preventDefault();
    const { x, y } = coordinates(event);
    if (state.activeTool === "eyedropper") {
      const color = state.matrix[y][x];
      if (color) setDrawingColor(color);
      setTool("pencil");
      return;
    }
    if (state.activeTool === "fill") {
      if (state.matrix[y][x] === pixelColor()) return;
      pushUndo();
      fillAt(x, y);
      $("#undo-button").disabled = state.undoStack.length === 0;
      $("#redo-button").disabled = state.redoStack.length === 0;
      return;
    }
    if (state.matrix[y][x] === pixelColor()) return;
    pushUndo();
    state.drawing = true;
    state.currentStrokeChanged = false;
    $("#pixel-canvas").setPointerCapture(event.pointerId);
    paintAt(x, y);
  }

  function continueStroke(event) {
    if (!state.drawing) return;
    const { x, y } = coordinates(event);
    paintAt(x, y);
  }

  function endStroke() {
    if (!state.drawing) return;
    state.drawing = false;
    if (!state.currentStrokeChanged) state.undoStack.pop();
    $("#undo-button").disabled = state.undoStack.length === 0;
    $("#redo-button").disabled = state.redoStack.length === 0;
  }

  function setTool(tool) {
    state.activeTool = tool;
    document.querySelectorAll(".tool-button").forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
  }

  function resizeGrid(size) {
    const width = Number(size);
    const height = width;
    if (width === state.width) return;
    pushUndo();
    const resized = createMatrix(width, height);
    for (let y = 0; y < Math.min(height, state.height); y++) {
      for (let x = 0; x < Math.min(width, state.width); x++) resized[y][x] = state.matrix[y][x];
    }
    state.width = width;
    state.height = height;
    state.matrix = resized;
    $("#undo-button").disabled = false;
    $("#redo-button").disabled = true;
    renderCanvas();
  }

  // Posts the sprite name, dimensions, and matrix to the assets API, then refreshes both sprite lists.
  async function saveSprite() {
    if (!state.project) return;
    const name = $("#sprite-name").value.trim() || "Untitled sprite";
    try {
      await request("/api/projects/" + state.project.id + "/assets", {
        method: "POST",
        body: JSON.stringify({
          name,
          width: state.width,
          height: state.height,
          matrix: state.matrix,
          metadata: { format: "pixelforge-color-matrix", transparent: null },
        }),
      });
      $("#sprite-name").value = "";
      await refreshProjectData();
      showToast("Sprite saved to this project.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  // Adds an undo point before loading a saved sprite into the drawing canvas.
  function loadSprite(asset) {
    pushUndo();
    state.width = asset.width;
    state.height = asset.height;
    state.matrix = asset.matrix.map((row) => row.slice());
    $("#canvas-size").value = String(asset.width);
    $("#undo-button").disabled = false;
    renderCanvas();
  }

  // Updates saved sprite cards and the checklist used when generating a game.
  function renderAssets() {
    const list = $("#asset-list");
    const checklist = $("#sprite-checklist");
    list.replaceChildren();
    checklist.replaceChildren();
    $("#asset-count").textContent = String(state.assets.length);
    if (!state.assets.length) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "Draw a character, then save it here.";
      list.append(empty);
      const promptEmpty = document.createElement("p");
      promptEmpty.className = "empty-note";
      promptEmpty.textContent = "Save sprites to use them in a game.";
      checklist.append(promptEmpty);
      return;
    }
    for (const asset of state.assets) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "asset-card";
      const thumbnail = document.createElement("canvas");
      thumbnail.width = asset.width;
      thumbnail.height = asset.height;
      const ctx = thumbnail.getContext("2d");
      asset.matrix.forEach((row, y) => row.forEach((color, x) => {
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }));
      const details = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = asset.name;
      const size = document.createElement("small");
      size.textContent = asset.width + " × " + asset.height;
      details.append(title, size);
      card.append(thumbnail, details);
      card.addEventListener("click", () => loadSprite(asset));
      list.append(card);

      const label = document.createElement("label");
      label.className = "sprite-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = asset.id;
      input.checked = true;
      const caption = document.createElement("span");
      caption.textContent = asset.name;
      label.append(input, caption);
      checklist.append(label);
    }
  }

  function renderConversations() {
    const log = $("#chat-log");
    log.replaceChildren();
    if (!state.conversations.length) {
      const welcome = document.createElement("div");
      welcome.className = "chat-welcome";
      welcome.innerHTML = '<p>Let’s make something small and fun.</p><span>Try: “Make a one-screen game where my hero collects stars.”</span>';
      log.append(welcome);
      return;
    }
    for (const conversation of state.conversations) {
      appendChatMessage("You", conversation.prompt, "user", log);
      if (conversation.status === "complete") appendChatMessage("PixelForge", "Generated a game file. It is ready to inspect, edit, and run.", "assistant", log);
      else if (conversation.status === "failed") appendChatMessage("Couldn't generate", conversation.error || "The request failed.", "error", log);
    }
    log.scrollTop = log.scrollHeight;
  }

  function appendChatMessage(role, text, kind, container = $("#chat-log")) {
    const message = document.createElement("div");
    message.className = "chat-message " + kind;
    const label = document.createElement("div");
    label.className = "chat-role";
    label.textContent = role;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;
    message.append(label, bubble);
    container.append(message);
    container.scrollTop = container.scrollHeight;
    return message;
  }

  function renderVersions() {
    const select = $("#version-select");
    select.replaceChildren();
    if (!state.versions.length) {
      const option = document.createElement("option");
      option.textContent = "No versions";
      select.append(option);
      select.disabled = true;
      $("#restore-button").disabled = true;
      $("#version-count").textContent = "No saved versions";
      return;
    }
    state.versions.forEach((version) => {
      const option = document.createElement("option");
      option.value = version.id;
      option.textContent = "r" + version.revision + " · " + new Date(version.created_at).toLocaleString();
      select.append(option);
    });
    select.disabled = false;
    select.value = state.versions[0].id;
    $("#restore-button").disabled = false;
    $("#version-count").textContent = state.versions.length + (state.versions.length === 1 ? " saved version" : " saved versions");
  }

  // Reads the project API response and redraws its sprites, versions, and conversations.
  async function refreshProjectData() {
    if (!state.project) return;
    const details = await request("/api/projects/" + state.project.id);
    state.assets = details.assets;
    state.versions = details.versions;
    state.conversations = details.conversations;
    renderAssets();
    renderVersions();
    renderConversations();
  }

  // Reads one project from the projects API and updates its game code and workspace panels.
  async function loadProject(projectId) {
    stopGame();
    const details = await request("/api/projects/" + projectId);
    state.project = details.project;
    state.assets = details.assets;
    state.versions = details.versions;
    state.conversations = details.conversations;
    setEditorValue(details.latest_version ? details.latest_version.game_code : starterGame);
    $("#file-name").textContent = "game";
    renderCanvas();
    renderAssets();
    renderVersions();
    renderConversations();
    $("#project-select").value = projectId;
    setWorkspaceEnabled(true);
    $("#editor-mode").textContent = state.monaco ? "Code editor" : "Text editor";
    setSaveStatus("Saved", "saved");
    if (state.monaco) state.monaco.focus();
    if (details.latest_version) $("#export-button").disabled = false;
    else $("#export-button").disabled = true;
  }

  // Reads the projects API response and refreshes the project selector.
  async function refreshProjectList(selectedId) {
    const result = await request("/api/projects");
    state.projects = result.projects;
    const select = $("#project-select");
    select.replaceChildren();
    for (const project of state.projects) {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      select.append(option);
    }
    if (selectedId) select.value = selectedId;
  }

  // Posts a project name; opens the returned project and saves its initial game version.
  async function createProject(name) {
    const result = await request("/api/projects", { method: "POST", body: JSON.stringify({ name }) });
    await refreshProjectList(result.project.id);
    await loadProject(result.project.id);
    await saveVersion(false);
    return result.project;
  }

  // Posts game code to the versions API, then refreshes version history and save status.
  function saveVersion(automatic = false) {
    if (!state.project || !state.code.trim()) return Promise.resolve(null);
    clearTimeout(state.autosaveTimer);
    const projectId = state.project.id;
    const code = state.code;
    setSaveStatus(automatic ? "Autosaving…" : "Saving…", "saving");
    const task = state.saveQueue.then(async () => {
      const result = await request("/api/projects/" + projectId + "/versions", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (state.project?.id === projectId) {
        await refreshProjectData();
        $("#export-button").disabled = false;
        if (state.code === code) {
          state.codeDirty = false;
          setSaveStatus(result.unchanged ? "All changes saved" : "Saved", "saved");
        } else {
          setSaveStatus("Unsaved changes");
        }
      }
      return result;
    }).catch((error) => {
      if (state.project?.id === projectId) setSaveStatus("Save failed");
      showToast("Could not save this version: " + error.message, true);
      return null;
    });
    state.saveQueue = task.then(() => undefined);
    return task;
  }

  // Posts a restore request for the selected version, then reloads the project and reports its revision.
  async function restoreVersion() {
    if (!state.project || !$("#version-select").value) return;
    const versionId = $("#version-select").value;
    if (state.codeDirty && !(await saveVersion(true))) return;
    try {
      const result = await request("/api/projects/" + state.project.id + "/versions/" + versionId + "/restore", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadProject(state.project.id);
      showToast("Restored as version r" + result.version.revision + ".");
    } catch (error) {
      showToast("Could not restore the version: " + error.message, true);
    }
  }

  // Fetches the saved game from the project export endpoint and downloads the returned HTML file.
  async function exportGame() {
    if (!state.project) return;
    try {
      if (state.codeDirty && !(await saveVersion(false))) throw new Error("Save the current changes before exporting.");
      const response = await fetch("/api/projects/" + state.project.id + "/export");
      if (!response.ok) {
        const detail = await response.json();
        throw new Error(detail.error || "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = state.project.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-") + ".html";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Game exported.");
    } catch (error) {
      showToast("Could not export the game: " + error.message, true);
    }
  }

  function selectedAssetIds() {
    return Array.from($("#sprite-checklist").querySelectorAll("input:checked"), (input) => input.value);
  }

  // Posts the prompt and selected sprite IDs to the AI endpoint, then saves its response to the editor/history.
  async function generateGame(event) {
    event.preventDefault();
    const prompt = $("#game-prompt").value.trim();
    if (!prompt || !state.project) return;
    const submit = $("#send-prompt");
    const textArea = $("#game-prompt");
    const originalLabel = submit.firstElementChild.textContent;
    appendChatMessage("You", prompt, "user");
    const progress = appendChatMessage("PixelForge", "Thinking up your game…", "assistant");
    submit.disabled = true;
    textArea.disabled = true;
    submit.firstElementChild.textContent = "Making…";
    try {
      const result = await request("/api/projects/" + state.project.id + "/ai", {
        method: "POST",
        body: JSON.stringify({ prompt, asset_ids: selectedAssetIds() }),
      });
      state.conversations.push(result.conversation);
      progress.querySelector(".chat-bubble").textContent = "Game generated. Review it in the workbench, then run the preview.";
      setEditorValue(result.conversation.response);
      await refreshProjectData();
      $("#export-button").disabled = false;
      setSaveStatus("Saved", "saved");
      textArea.value = "";
    } catch (error) {
      progress.classList.add("error");
      progress.querySelector(".chat-role").textContent = "Couldn't generate";
      progress.querySelector(".chat-bubble").textContent = error.message;
      showToast(error.message, true);
      try {
        const details = await request("/api/projects/" + state.project.id);
        state.conversations = details.conversations;
        renderConversations();
      } catch (refreshError) {
        console.error("Could not refresh conversation history:", refreshError);
      }
    } finally {
      submit.disabled = false;
      textArea.disabled = false;
      submit.firstElementChild.textContent = originalLabel;
      textArea.focus();
    }
  }

  // Posts game code to the preview endpoint and loads its returned URL in the sandboxed iframe.
  async function runGame() {
    if (!state.project) return;
    stopGame();
    if (new Blob([state.code]).size > 256 * 1024) {
      showGameError("Game file exceeds the 256 KB preview limit.");
      return;
    }
    const runId = state.previewRunId;
    const frame = $("#game-frame");
    $("#game-errors").hidden = true;
    $("#game-errors").textContent = "";
    $("#preview-placeholder").hidden = true;
    $("#preview-state").textContent = "Preparing preview…";
    try {
      const result = await request("/api/preview", {
        method: "POST",
        body: JSON.stringify({ code: state.code }),
      });
      if (runId !== state.previewRunId) {
        fetch("/api/preview/" + result.url.split("/").pop() + "/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }).catch((error) => console.error("Could not release stopped preview:", error));
        return;
      }
      state.previewToken = result.url.split("/").pop();
      frame.hidden = false;
      frame.src = result.url;
      $("#preview-state").textContent = "Running · 60 sec";
      $("#preview-state").classList.add("is-running");
      $("#stop-button").disabled = false;
      state.previewTimer = setTimeout(() => {
        stopGame();
        showGameError("Preview stopped after 60 seconds. Run it again to continue testing.");
      }, previewLimitMs);
    } catch (error) {
      stopGame();
      showGameError("Could not start preview: " + error.message);
    }
  }

  function showGameError(message, line) {
    const panel = $("#game-errors");
    panel.textContent = (line ? "Line " + line + ": " : "") + message;
    panel.hidden = false;
  }

  // Captures the pointer and records editor/preview sizes so the preview can grow upward.
  function startPreviewResize(event) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    const shell = $("#preview-shell");
    const codeArea = $(".code-area");
    const codeHeight = codeArea.getBoundingClientRect().height;
    const minCodeHeight = Number.parseFloat(getComputedStyle(codeArea).minHeight);
    state.previewResize = {
      pointerId: event.pointerId,
      startY: event.clientY,
      previewHeight: shell.getBoundingClientRect().height,
      codeHeight,
      minCodeHeight,
    };
    $(".workbench-panel").classList.add("is-resizing-preview");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  // Resizes the preview against the editor while keeping the workbench's bottom edge fixed.
  function resizePreview(event) {
    const resize = state.previewResize;
    if (!resize || event.pointerId !== resize.pointerId) return;
    const delta = resize.startY - event.clientY;
    const maxIncrease = Math.max(0, resize.codeHeight - resize.minCodeHeight);
    const appliedDelta = Math.max(180 - resize.previewHeight, Math.min(maxIncrease, delta));
    $("#preview-shell").style.height = resize.previewHeight + appliedDelta + "px";
    $(".code-area").style.height = resize.codeHeight - appliedDelta + "px";
  }

  // Ends the captured resize interaction when the pointer is released or cancelled.
  function endPreviewResize(event) {
    if (!state.previewResize || event.pointerId !== state.previewResize.pointerId) return;
    state.previewResize = null;
    $(".workbench-panel").classList.remove("is-resizing-preview");
  }

  function stopGame() {
    state.previewRunId++;
    clearTimeout(state.previewTimer);
    state.previewTimer = null;
    if (state.previewToken) {
      const token = state.previewToken;
      state.previewToken = null;
      fetch("/api/preview/" + token + "/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch((error) => console.error("Could not release preview:", error));
    }
    const frame = $("#game-frame");
    if (frame) {
      frame.removeAttribute("src");
      frame.hidden = true;
    }
    const placeholder = $("#preview-placeholder");
    if (placeholder) placeholder.hidden = false;
    const status = $("#preview-state");
    if (status) {
      status.textContent = "Stopped";
      status.classList.remove("is-running");
    }
    const stop = $("#stop-button");
    if (stop) stop.disabled = true;
  }

  function openProjectDialog() {
    $("#project-name").value = "";
    $("#project-dialog").showModal();
    $("#project-name").focus();
  }

  function bindEvents() {
    $("#new-project").addEventListener("click", openProjectDialog);
    $("#cancel-project").addEventListener("click", () => $("#project-dialog").close());
    $("#project-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        await createProject($("#project-name").value.trim());
        $("#project-dialog").close();
        showToast("Project created. Draw a sprite or ask AI to make a game.");
      } catch (error) {
        showToast("Could not create project: " + error.message, true);
      } finally {
        button.disabled = false;
      }
    });
    $("#project-select").addEventListener("change", async (event) => {
      const previousProjectId = state.project?.id;
      try {
        if (state.codeDirty && !(await saveVersion(true))) {
          event.target.value = previousProjectId || "";
          return;
        }
        await loadProject(event.target.value);
      } catch (error) {
        showToast("Could not open this project: " + error.message, true);
      }
    });
    $("#save-button").addEventListener("click", () => saveVersion(false));
    $("#export-button").addEventListener("click", exportGame);
    $("#restore-button").addEventListener("click", restoreVersion);
    $("#save-sprite").addEventListener("click", saveSprite);
    $("#prompt-form").addEventListener("submit", generateGame);
    $("#run-button").addEventListener("click", runGame);
    $("#stop-button").addEventListener("click", stopGame);
    $("#restart-button").addEventListener("click", runGame);
    const resizeHandle = $("#preview-resize-handle");
    resizeHandle.addEventListener("pointerdown", startPreviewResize);
    resizeHandle.addEventListener("pointermove", resizePreview);
    resizeHandle.addEventListener("pointerup", endPreviewResize);
    resizeHandle.addEventListener("pointercancel", endPreviewResize);
    resizeHandle.addEventListener("lostpointercapture", endPreviewResize);
    window.addEventListener("resize", () => {
      if (state.previewResize) return;
      $("#preview-shell").style.removeProperty("height");
      $(".code-area").style.removeProperty("height");
    });
    $("#undo-button").addEventListener("click", undo);
    $("#redo-button").addEventListener("click", redo);
    $("#canvas-size").addEventListener("change", (event) => resizeGrid(event.target.value));
    $("#zoom-out").addEventListener("click", () => {
      state.zoom = Math.max(50, state.zoom - 25);
      renderCanvas();
    });
    $("#zoom-in").addEventListener("click", () => {
      state.zoom = Math.min(200, state.zoom + 25);
      renderCanvas();
    });
    $("#color-picker").addEventListener("input", (event) => setDrawingColor(event.target.value));
    $("#transparent-color").addEventListener("click", () => {
      state.selectedColorMode = "transparent";
      setTool("pencil");
    });
    document.querySelectorAll(".tool-button").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
    const canvas = $("#pixel-canvas");
    canvas.addEventListener("pointerdown", startStroke);
    canvas.addEventListener("pointermove", continueStroke);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    $("#code-fallback").addEventListener("input", (event) => {
      if (!state.suppressEditorEvents) updateCode(event.target.value);
    });
    $("#code-fallback").addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const input = event.currentTarget;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.setRangeText("  ", start, end, "end");
        updateCode(input.value);
      }
    });
    $("#game-prompt").addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") $("#prompt-form").requestSubmit();
    });
    window.addEventListener("message", (event) => {
      if (event.source !== $("#game-frame").contentWindow || !event.data || event.data.type !== "pixelforge-error") return;
      showGameError(String(event.data.message || "Game error").slice(0, 1000), Number(event.data.line) || 0);
    });
    window.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveVersion(false);
        return;
      }
      if (event.metaKey || event.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) return;
      const shortcuts = { p: "pencil", e: "eraser", f: "fill", i: "eyedropper" };
      if (shortcuts[event.key.toLowerCase()]) setTool(shortcuts[event.key.toLowerCase()]);
    });
  }

  async function initialize() {
    renderPalette();
    renderCanvas();
    $("#undo-button").disabled = true;
    $("#redo-button").disabled = true;
    bindEvents();
    initializeMonaco();
    try {
      const [status, projects] = await Promise.all([request("/api/status"), request("/api/projects")]);
      const geminiStatus = $("#gemini-status");
      geminiStatus.textContent = status.gemini_configured
        ? "Gemini is ready"
        : status.gemini_error || "Set GEMINI_API_KEY on the server to enable generation";
      geminiStatus.classList.toggle("is-ready", status.gemini_configured);
      state.projects = projects.projects;
      await refreshProjectList();
      if (state.projects.length) await loadProject(state.projects[0].id);
    } catch (error) {
      showToast("PixelForge could not load its local data: " + error.message, true);
      console.error(error);
    }
  }

  initialize();
})();
