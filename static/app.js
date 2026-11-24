const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const GRID = 16;
const COLORS = ['#1f2433','#ffffff','#9aa5b8','#e5484d','#f08a24','#ffd23f','#6cc04a','#2f9e44',
                '#8fd3ff','#4b8bf5','#3b4cca','#7c4dff','#e05fb0','#7a4a2a','#f2c9a0','#0f766e'];
const S = { pid: null, name: '', sprites: [], files: { html: '', css: '', js: '' }, sel: new Map(),
            pixels: blank(), undo: [], redo: [], tool: 'pencil', color: COLORS[0], zoom: 20, editing: null, dirty: false };

function blank() { return Array(GRID * GRID).fill(''); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3500); }
function guard(fn) { return async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } }; }

/* ---------- sprite images (64x64 data URLs, same look as the exported PNGs) ---------- */
function dataUrl(pixels) {
  const c = document.createElement('canvas'); c.width = c.height = GRID * 4;
  const x = c.getContext('2d');
  pixels.forEach((p, i) => { if (p) { x.fillStyle = p; x.fillRect((i % GRID) * 4, Math.floor(i / GRID) * 4, 4, 4); } });
  return c.toDataURL('image/png');
}

/* ---------- workspaces ---------- */
let current = 'studio';
async function show(tab) {
  if (current === 'preview' && tab !== 'preview') stopGame();
  current = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $$('.ws').forEach(w => w.classList.toggle('on', w.id === tab));
  if (tab === 'builder') renderSel();
  if (tab === 'preview') { await saveGame(); runGame(); }
}
$$('#tabs button').forEach(b => b.onclick = guard(() => show(b.dataset.tab)));

/* ---------- projects ---------- */
async function loadProjects(selectId) {
  let list = await api('/projects');
  if (!list.length) { await api('/projects', 'POST', { name: 'My first project' }); list = await api('/projects'); }
  $('#project').innerHTML = list.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  const want = selectId || +localStorage.getItem('pf-project');
  await openProject(list.some(p => p.id === want) ? want : list[list.length - 1].id);
}
async function openProject(id) {
  const p = await api('/projects/' + id);
  S.pid = p.id; S.name = p.name; S.sprites = p.sprites; S.files = p.game; S.sel.clear(); S.dirty = false;
  localStorage.setItem('pf-project', id);
  $('#project').value = id;
  newSprite(); renderList(); renderSel(); pushFiles();
}
$('#project').onchange = guard(e => openProject(+e.target.value));
$('#newProject').onclick = guard(async () => {
  const name = prompt('Project name');
  if (name) { const p = await api('/projects', 'POST', { name }); await loadProjects(p.id); }
});
$('#demo').onclick = guard(async () => {
  const d = await api('/demo', 'POST');
  await loadProjects(d.project.id);
  S.sprites.forEach(s => { if (d.roles[s.name]) S.sel.set(s.id, d.roles[s.name]); });
  $('#prompt').value = d.prompt; $('#fresh').checked = true;
  await show('builder');
  toast('Demo loaded. Press Generate game to build it with the AI.');
});

/* ---------- Pixel Studio ---------- */
const pix = $('#pix');
function drawPix() {
  const z = S.zoom; pix.width = pix.height = GRID * z;
  const x = pix.getContext('2d');
  for (let i = 0; i < GRID * GRID; i++) {
    const px = i % GRID, py = Math.floor(i / GRID);
    x.fillStyle = (px + py) % 2 ? '#EFE3CE' : '#E2D2B9'; x.fillRect(px * z, py * z, z, z);
    if (S.pixels[i]) { x.fillStyle = S.pixels[i]; x.fillRect(px * z, py * z, z, z); }
  }
  x.strokeStyle = 'rgba(67,41,29,.16)'; x.beginPath();
  for (let i = 0; i <= GRID; i++) { x.moveTo(i * z + .5, 0); x.lineTo(i * z + .5, GRID * z); x.moveTo(0, i * z + .5); x.lineTo(GRID * z, i * z + .5); }
  x.stroke();
  $('#zoomLabel').textContent = z + 'px';
}
function paint(e) {
  const r = pix.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * GRID), y = Math.floor((e.clientY - r.top) / r.height * GRID);
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
  const v = S.tool === 'pencil' ? S.color : '', i = y * GRID + x;
  if (S.pixels[i] !== v) { S.pixels[i] = v; drawPix(); }
}
let drawing = false;
pix.onpointerdown = e => { pix.setPointerCapture(e.pointerId); S.undo.push([...S.pixels]); S.redo = []; drawing = true; paint(e); };
pix.onpointermove = e => drawing && paint(e);
pix.onpointerup = pix.onpointercancel = () => drawing = false;
$('#undo').onclick = () => { if (S.undo.length) { S.redo.push([...S.pixels]); S.pixels = S.undo.pop(); drawPix(); } };
$('#redo').onclick = () => { if (S.redo.length) { S.undo.push([...S.pixels]); S.pixels = S.redo.pop(); drawPix(); } };
$('#zoomIn').onclick = () => { S.zoom = Math.min(36, S.zoom + 4); drawPix(); };
$('#zoomOut').onclick = () => { S.zoom = Math.max(8, S.zoom - 4); drawPix(); };
['pencil', 'eraser'].forEach(t => $('#' + t).onclick = () => {
  S.tool = t; $('#pencil').classList.toggle('on', t === 'pencil'); $('#eraser').classList.toggle('on', t === 'eraser');
});
$('#palette').innerHTML = COLORS.map((c, i) => `<button style="background:${c}" data-c="${c}" aria-label="Colour ${c}" class="${i ? '' : 'on'}"></button>`).join('');
$$('#palette button').forEach(b => b.onclick = () => {
  S.color = b.dataset.c; S.tool = 'pencil'; $('#pencil').click();
  $$('#palette button').forEach(x => x.classList.toggle('on', x === b));
});
function newSprite() { S.editing = null; S.pixels = blank(); S.undo = []; S.redo = []; $('#sname').value = ''; $('#scat').value = 'Character'; drawPix(); renderList(); }
$('#newSprite').onclick = newSprite;
$('#saveSprite').onclick = guard(async () => {
  const body = { name: $('#sname').value, category: $('#scat').value, pixels: S.pixels };
  const s = S.editing ? await api('/sprites/' + S.editing, 'PUT', body) : await api(`/projects/${S.pid}/sprites`, 'POST', body);
  S.editing = s.id;
  S.sprites = (await api('/projects/' + S.pid)).sprites;
  renderList(); toast('Sprite saved');
});
function renderList() {
  $('#count').textContent = S.sprites.length ? `(${S.sprites.length})` : '';
  const box = $('#spriteList');
  if (!S.sprites.length) { box.innerHTML = '<p class="hint">Draw a sprite and save it. It will appear here.</p>'; return; }
  box.innerHTML = S.sprites.map(s => `<div class="card ${s.id === S.editing ? 'on' : ''}" data-id="${s.id}">
    <button class="del" title="Delete sprite" aria-label="Delete ${esc(s.name)}">×</button>
    <img src="${dataUrl(s.pixels)}" alt=""><b>${esc(s.name)}</b><small>${esc(s.category)}</small></div>`).join('');
  $$('#spriteList .card').forEach(c => {
    const s = S.sprites.find(x => x.id === +c.dataset.id);
    c.onclick = () => { S.editing = s.id; S.pixels = [...s.pixels]; S.undo = []; S.redo = []; $('#sname').value = s.name; $('#scat').value = s.category; drawPix(); renderList(); };
    c.querySelector('.del').onclick = guard(async e => {
      e.stopPropagation();
      if (!confirm(`Delete "${s.name}"?`)) return;
      await api('/sprites/' + s.id, 'DELETE');
      S.sprites = S.sprites.filter(x => x.id !== s.id); S.sel.delete(s.id);
      if (S.editing === s.id) newSprite(); else renderList();
    });
  });
}

/* ---------- Monaco editor (falls back to a textarea if the CDN is unreachable) ---------- */
const MONACO = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min';
const LANG = { html: 'html', css: 'css', js: 'javascript' };
let editor = null, models = {}, curFile = 'html';
function initEditor() {
  if (!window.require || !require.config) return useFallback();
  window.MonacoEnvironment = { getWorkerUrl: () => URL.createObjectURL(new Blob(
    [`self.MonacoEnvironment={baseUrl:'${MONACO}/'};importScripts('${MONACO}/vs/base/worker/workerMain.js');`], { type: 'text/javascript' })) };
  require.config({ paths: { vs: MONACO + '/vs' } });
  require(['vs/editor/editor.main'], () => {
    monaco.editor.defineTheme('drafting', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#24242D', 'editor.foreground': '#F4E8D0', 'editorLineNumber.foreground': '#80644F', 'editorCursor.foreground': '#C94F3D', 'editor.selectionBackground': '#43291D99', 'editor.lineHighlightBackground': '#2E2E38' } });
    editor = monaco.editor.create($('#monaco'), { model: null, theme: 'drafting', automaticLayout: true, minimap: { enabled: false }, fontSize: 13 });
    for (const f in LANG) {
      models[f] = monaco.editor.createModel(S.files[f] || '', LANG[f]);
      models[f].onDidChangeContent(() => { S.files[f] = models[f].getValue(); S.dirty = true; });
    }
    editor.setModel(models[curFile]);
  }, useFallback);
}
function useFallback() {
  $('#monaco').hidden = true; const t = $('#fallback'); t.hidden = false; t.value = S.files[curFile] || '';
  t.oninput = () => { S.files[curFile] = t.value; S.dirty = true; };
}
function pushFiles() {
  for (const f in LANG) if (models[f] && models[f].getValue() !== (S.files[f] || '')) models[f].setValue(S.files[f] || '');
  if (!editor) $('#fallback').value = S.files[curFile] || '';
  S.dirty = false;
}
$$('#ftabs button').forEach(b => b.onclick = () => {
  curFile = b.dataset.f; $$('#ftabs button').forEach(x => x.classList.toggle('on', x === b));
  if (editor) editor.setModel(models[curFile]); else $('#fallback').value = S.files[curFile] || '';
});
async function saveGame() { if (S.dirty) { await api(`/projects/${S.pid}/game`, 'PUT', S.files); S.dirty = false; } }

/* ---------- AI Game Builder ---------- */
function renderSel() {
  const box = $('#selected');
  for (const id of [...S.sel.keys()]) if (!S.sprites.some(s => s.id === id)) S.sel.delete(id);
  if (!S.sel.size) { box.innerHTML = '<p class="hint">No assets chosen. Choose the sprites your game should use.</p>'; return; }
  box.innerHTML = [...S.sel].map(([id, role]) => {
    const s = S.sprites.find(x => x.id === id);
    return `<div class="asel" data-id="${id}"><img src="${dataUrl(s.pixels)}" alt=""><div><b>${esc(s.name)} <small class="muted">${esc(s.category)}</small></b>
      <input value="${esc(role)}" placeholder="Role, e.g. Player controlled with arrow keys" aria-label="Role of ${esc(s.name)}"></div>
      <button class="x" aria-label="Remove ${esc(s.name)}">×</button></div>`;
  }).join('');
  $$('#selected .asel').forEach(r => {
    const id = +r.dataset.id;
    r.querySelector('input').oninput = e => S.sel.set(id, e.target.value);
    r.querySelector('.x').onclick = () => { S.sel.delete(id); renderSel(); };
  });
}
$('#chooseAssets').onclick = () => {
  const grid = $('#pickGrid');
  const draw = () => {
    grid.innerHTML = S.sprites.length ? S.sprites.map(s => `<div class="card ${S.sel.has(s.id) ? 'on' : ''}" data-id="${s.id}" tabindex="0">
      <img src="${dataUrl(s.pixels)}" alt=""><b>${esc(s.name)}</b><small>${esc(s.category)}</small></div>`).join('')
      : '<p class="hint">No sprites in this project yet. Create some in Pixel Studio.</p>';
    $$('#pickGrid .card').forEach(c => c.onclick = () => {
      const id = +c.dataset.id; S.sel.has(id) ? S.sel.delete(id) : S.sel.set(id, ''); draw();
    });
  };
  draw(); $('#picker').showModal();
};
$('#pickDone').onclick = () => { $('#picker').close(); renderSel(); };

function status(msg, cls = '') { const s = $('#status'); s.textContent = msg; s.className = cls; }
$('#generate').onclick = async () => {
  const btn = $('#generate'); btn.disabled = true; const t0 = Date.now(); const tick = setInterval(() => status(`Generating your game… ${Math.round((Date.now() - t0) / 1000)}s`), 1000); status('Generating your game…');
  try {
    const d = await api(`/projects/${S.pid}/generate`, 'POST', {
      prompt: $('#prompt').value, fresh: $('#fresh').checked,
      assets: [...S.sel].map(([id, role]) => ({ id, role })) });
    S.files = { html: d.html, css: d.css, js: d.js }; pushFiles();
    $('#fresh').checked = false; status(d.summary || 'Game generated. Open Game Preview to play it.', 'ok');
  } catch (e) { status(e.message, 'err'); } finally { clearInterval(tick); btn.disabled = false; }
};

/* ---------- Game Preview (sandboxed iframe, no same-origin access) ---------- */
const HARNESS = `(()=>{const P=m=>parent.postMessage({pf:1,...m},'*');let paused=false,pt=0,off=0,q=[];
const raf=window.requestAnimationFrame.bind(window),pn=performance.now.bind(performance),si=window.setInterval.bind(window);
performance.now=()=>(paused?pt:pn())-off;
window.requestAnimationFrame=cb=>raf(()=>{paused?q.push(cb):cb(performance.now())});
window.setInterval=(f,t,...a)=>si((...x)=>{if(!paused)f(...x)},t,...a);
addEventListener('message',e=>{if(e.data==='pause'&&!paused){paused=true;pt=pn()}else if(e.data==='play'&&paused){off+=pn()-pt;paused=false;q.splice(0).forEach(cb=>window.requestAnimationFrame(cb))}});
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault()});
addEventListener('error',e=>P({error:e.target&&e.target.getAttribute&&e.target.getAttribute('src')?'Missing image: '+e.target.getAttribute('src').slice(0,40):e.message}),true);
addEventListener('unhandledrejection',e=>P({error:String(e.reason)}));})();`;
const LABEL = /^\s*(?:[\[(]\s*)?(?:index\.html|style\.css|script\.js)(?:\s*[\])])?\s*:?\s*(?:\r?\n|$)/i;
function clean(t) { t = t || ''; let p; do { p = t; t = t.replace(LABEL, ''); } while (t !== p); return t; }
function buildDoc() {
  const urls = {}; S.sprites.forEach(s => urls[s.filename] = dataUrl(s.pixels));
  const inline = t => t.replace(/assets\/([\w.\-]+\.png)/g, (m, f) => urls[f] || m);
  let html = inline(clean(S.files.html)).replace(/<link[^>]*style\.css[^>]*>/gi, '').replace(/<script[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/gi, '');
  const head = `<script>${HARNESS}<\/script><style>${inline(clean(S.files.css))}</style>`;
  const tail = `<script>${inline(clean(S.files.js)).replace(/<\/script/gi, '<\\/script')}<\/script>`;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => head + '</head>') : head + html;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => tail + '</body>') : html + tail;
}
const frame = $('#frame');
function runGame() {
  $('#perr').hidden = true;
  if (!(S.files.js || '').trim()) { $('#empty').hidden = false; frame.srcdoc = ''; return; }
  $('#empty').hidden = true; frame.srcdoc = buildDoc(); frame.onload = () => frame.focus();
}
function stopGame() { frame.srcdoc = ''; $('#empty').textContent = 'Stopped. Press Play to run the game again.'; $('#empty').hidden = false; }
$('#play').onclick = () => { if (!frame.srcdoc || $('#empty').hidden === false) runGame(); else frame.contentWindow.postMessage('play', '*'); frame.focus(); };
$('#pause').onclick = () => frame.contentWindow && frame.contentWindow.postMessage('pause', '*');
$('#restart').onclick = runGame;
$('#stop').onclick = stopGame;
$('#full').onclick = () => $('#stage').requestFullscreen && $('#stage').requestFullscreen();
addEventListener('message', e => {
  if (e.source === frame.contentWindow && e.data && e.data.pf && e.data.error) { const p = $('#perr'); p.textContent = 'Game error: ' + e.data.error; p.hidden = false; }
});

/* ---------- Export ---------- */
$('#export').onclick = guard(async () => {
  if (!(S.files.js || '').trim()) throw new Error('Generate a game before exporting.');
  await saveGame(); location.href = `/api/projects/${S.pid}/export`;
});

/* ---------- start ---------- */
$$('.ws').forEach(w => w.classList.toggle('on', w.id === 'studio'));
initEditor();
loadProjects().catch(e => toast(e.message));
