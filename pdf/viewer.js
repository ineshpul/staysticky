// Renders a PDF in place of Chrome's built-in viewer and pins Stay Sticky
// notes to a page position, so they come back on the same file.
// PDF.js (Mozilla, Apache-2.0) lives in ./vendor.

import { getDocument, GlobalWorkerOptions, TextLayer } from './vendor/pdf.min.mjs';

GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf/vendor/pdf.worker.min.mjs');

const COLORS = ['#FFF59D', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2'];
const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 190;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 120;

const notesOnPage = {};
const minimizedChips = {};
const noteById = {};
let tray = null;
let pdfDoc = null;
let scale = 1;
let pageKey = '';
let pageUrl = '';
let pageTitle = 'PDF';
let embedded = false;
let renderToken = 0;
let pageObserver = null;
const renderTasks = [];
let pendingAdds = 0;
let viewerReady = false;
let pdfPort = null;

function mimeApi() {
  return chrome.mimeHandler || null;
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function showMessage(text) {
  const el = document.getElementById('ss-pdf-message');
  if (!text) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = text;
}

function headerValue(headers, name) {
  if (!headers) return '';
  const wanted = name.toLowerCase();
  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (!entry) continue;
      const key = Array.isArray(entry) ? entry[0] : entry.name;
      const value = Array.isArray(entry) ? entry[1] : entry.value;
      if (String(key || '').toLowerCase() === wanted) return String(value || '');
    }
    return '';
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) return String(headers[key] || '');
  }
  return '';
}

function filenameFromDisposition(headers) {
  const value = headerValue(headers, 'content-disposition');
  if (!value) return '';
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(value);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch (e) {
      return star[1].trim().replace(/^"|"$/g, '');
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(value);
  return plain ? plain[1].trim() : '';
}

function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    if (last && !/^(view|preview|edit|uc|export|download)$/i.test(last)) return last;
  } catch (e) {
    return '';
  }
  return '';
}

function setZoomLabel() {
  document.getElementById('ss-zoom-label').textContent = Math.round(scale * 100) + '%';
}

function mostVisiblePage() {
  const pages = document.querySelectorAll('.ss-pdf-page');
  if (!pages.length) return 1;
  const scroll = document.getElementById('ss-pdf-scroll');
  const scrollRect = scroll.getBoundingClientRect();
  let best = 1;
  let bestOverlap = -1;
  pages.forEach((page) => {
    const rect = page.getBoundingClientRect();
    const overlap = Math.min(rect.bottom, scrollRect.bottom) - Math.max(rect.top, scrollRect.top);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = Number(page.dataset.page) || 1;
    }
  });
  return best;
}

function updatePageLabel() {
  const label = document.getElementById('ss-pdf-pages');
  if (!pdfDoc) {
    label.textContent = '';
    return;
  }
  label.textContent = mostVisiblePage() + ' / ' + pdfDoc.numPages;
}

function pageAliases() {
  return typeof ssPageKeyAliases === 'function' ? ssPageKeyAliases(pageUrl) : new Set([pageKey]);
}

function belongsHere(note) {
  return Boolean(note && pageAliases().has(note.pageKey));
}

function anchorFor(note) {
  const pages = pdfDoc ? pdfDoc.numPages : 1;
  const raw = note && note.pdfAnchor;
  let page = raw ? Number(raw.page) : 1;
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > pages) page = pages;
  let xRatio = raw ? Number(raw.xRatio) : NaN;
  let yRatio = raw ? Number(raw.yRatio) : NaN;
  if (!Number.isFinite(xRatio)) xRatio = 0.08;
  if (!Number.isFinite(yRatio)) yRatio = 0.08;
  return {
    page,
    xRatio: clamp(xRatio, 0, 0.92),
    yRatio: clamp(yRatio, 0, 0.92),
  };
}

function cancelRenders() {
  renderTasks.forEach((task) => {
    try {
      task.cancel();
    } catch (e) {
      /* already finished */
    }
  });
  renderTasks.length = 0;
  if (pageObserver) {
    pageObserver.disconnect();
    pageObserver = null;
  }
}

async function renderPageCanvas(wrap, token) {
  if (!wrap || wrap.dataset.drawn === '1' || token !== renderToken) return;
  wrap.dataset.drawn = '1';
  const pageNum = Number(wrap.dataset.page);
  try {
    const page = await pdfDoc.getPage(pageNum);
    if (!wrap.isConnected || token !== renderToken) return;
    const viewport = page.getViewport({ scale });
    wrap.style.setProperty('--scale-factor', String(viewport.scale));
    const canvas = wrap.querySelector('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    const renderParams = {
      canvasContext: canvas.getContext('2d', { alpha: false }),
      viewport,
    };
    if (dpr !== 1) renderParams.transform = [dpr, 0, 0, dpr, 0, 0];
    const task = page.render(renderParams);
    renderTasks.push(task);
    await task.promise;
    if (!wrap.isConnected || token !== renderToken) return;
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    canvas.after(textLayerDiv);
    const textContent = await page.getTextContent();
    if (!wrap.isConnected || token !== renderToken) return;
    const textLayer = new TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
    });
    await textLayer.render();
  } catch (err) {
    if (err && err.name === 'RenderingCancelledException') return;
    wrap.dataset.drawn = '';
  }
}

async function buildShells() {
  const token = ++renderToken;
  cancelRenders();
  const stage = document.getElementById('ss-pdf-stage');
  stage.innerHTML = '';
  for (let i = 1; i <= pdfDoc.numPages; i += 1) {
    if (token !== renderToken) return;
    const page = await pdfDoc.getPage(i);
    if (token !== renderToken) return;
    const viewport = page.getViewport({ scale });
    const wrap = document.createElement('div');
    wrap.className = 'ss-pdf-page';
    wrap.dataset.page = String(i);
    wrap.style.width = viewport.width + 'px';
    wrap.style.height = viewport.height + 'px';
    wrap.style.setProperty('--scale-factor', String(viewport.scale));
    const canvas = document.createElement('canvas');
    canvas.className = 'ss-pdf-canvas';
    wrap.appendChild(canvas);
    const notes = document.createElement('div');
    notes.className = 'ss-pdf-notes';
    wrap.appendChild(notes);
    stage.appendChild(wrap);
  }
  if (token !== renderToken) return;

  const scroll = document.getElementById('ss-pdf-scroll');
  pageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) renderPageCanvas(entry.target, token);
      });
    },
    { root: scroll, rootMargin: '800px 0px' }
  );
  stage.querySelectorAll('.ss-pdf-page').forEach((page) => pageObserver.observe(page));
  const first = stage.querySelector('.ss-pdf-page');
  if (first) renderPageCanvas(first, token);
  mountAllNotes();
  updatePageLabel();
}

async function fitWidthAndRender() {
  const scroll = document.getElementById('ss-pdf-scroll');
  const first = await pdfDoc.getPage(1);
  const base = first.getViewport({ scale: 1 });
  const available = Math.max(280, scroll.clientWidth - 32);
  scale = clamp(available / base.width, 0.6, 2);
  setZoomLabel();
  await buildShells();
}

async function changeScale(delta) {
  scale = clamp(Math.round((scale + delta) * 100) / 100, 0.5, 3);
  setZoomLabel();
  await buildShells();
}

function getTray() {
  if (tray && tray.isConnected) return tray;
  tray = document.createElement('div');
  tray.id = 'ss-tray';
  tray.className = 'ss-tray ss-tray-with-quick-add';
  document.body.appendChild(tray);
  return tray;
}

function ensureQuickAdd() {
  if (embedded && !viewerIsLarge()) return;
  if (document.getElementById('ss-quick-add')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'ss-quick-add';
  button.className = 'ss-quick-add';
  button.title = 'Add sticky note';
  button.setAttribute('aria-label', 'Add sticky note');
  button.innerHTML =
    '<span class="ss-quick-add-bar" aria-hidden="true"></span>' +
    '<span class="ss-quick-add-plus" aria-hidden="true">+</span>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    createNewNote();
  });
  document.body.appendChild(button);
}

function placeNote(el, note) {
  const anchor = anchorFor(note);
  note.pdfAnchor = anchor;
  const page = document.querySelector('.ss-pdf-page[data-page="' + anchor.page + '"]');
  const layer = page && page.querySelector('.ss-pdf-notes');
  if (!layer) return false;
  layer.appendChild(el);
  el.style.left = anchor.xRatio * 100 + '%';
  el.style.top = anchor.yRatio * 100 + '%';
  return true;
}

function refreshProjectSelect(el, note) {
  const select = el.querySelector('.ss-note-project');
  if (!select) return;
  ssGetAllProjects((projects) => {
    const current = note.projectId || '';
    select.innerHTML = '<option value="">No project</option>';
    ssSortedProjects(projects).forEach((project) => {
      const opt = document.createElement('option');
      opt.value = project.id;
      opt.textContent = project.name;
      if (project.id === current) opt.selected = true;
      select.appendChild(opt);
    });
    const createOpt = document.createElement('option');
    createOpt.value = '__new__';
    createOpt.textContent = '+ New project…';
    select.appendChild(createOpt);
    select.value = current && projects[current] ? current : '';
  });
}

function wireCard(el, note) {
  const handle = el.querySelector('.ss-note-handle');
  const textarea = el.querySelector('.ss-note-text');
  const resizeHandle = el.querySelector('.ss-note-resize');
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || event.target.closest('select')) return;
    dragging = true;
    const rect = el.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const page = el.closest('.ss-pdf-page');
    if (!page) return;
    const rect = page.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left - offsetX, 0, Math.max(0, rect.width - 32));
    const y = clamp(event.clientY - rect.top - offsetY, 0, Math.max(0, rect.height - 32));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  });

  handle.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    const page = el.closest('.ss-pdf-page');
    if (!page) return;
    const rect = page.getBoundingClientRect();
    const x = el.offsetLeft;
    const y = el.offsetTop;
    note.pdfAnchor = {
      page: Number(page.dataset.page) || 1,
      xRatio: rect.width ? x / rect.width : 0,
      yRatio: rect.height ? y / rect.height : 0,
    };
    note.x = Math.round(x);
    note.y = Math.round(y);
    note.pageKey = pageKey;
    note.updatedAt = Date.now();
    ssSaveNote(note);
  });

  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  resizeHandle.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    resizing = true;
    startX = event.clientX;
    startY = event.clientY;
    startW = el.offsetWidth;
    startH = el.offsetHeight;
    resizeHandle.setPointerCapture(event.pointerId);
  });

  resizeHandle.addEventListener('pointermove', (event) => {
    if (!resizing) return;
    el.style.width = Math.max(MIN_WIDTH, startW + (event.clientX - startX)) + 'px';
    el.style.height = Math.max(MIN_HEIGHT, startH + (event.clientY - startY)) + 'px';
  });

  resizeHandle.addEventListener('pointerup', () => {
    if (!resizing) return;
    resizing = false;
    note.width = el.offsetWidth;
    note.height = el.offsetHeight;
    note.updatedAt = Date.now();
    ssSaveNote(note);
  });

  textarea.addEventListener(
    'input',
    debounce(() => {
      note.text = textarea.value;
      note.updatedAt = Date.now();
      ssSaveNote(note);
      const chip = minimizedChips[note.id];
      if (chip) {
        const label = chip.querySelector('.ss-chip-text');
        if (label) label.textContent = note.text.trim() ? note.text : '(empty note)';
      }
    }, 400)
  );

  el.querySelectorAll('.ss-color-dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      note.color = dot.dataset.color;
      el.style.background = note.color;
      note.updatedAt = Date.now();
      ssSaveNote(note);
    });
  });

  const projectSelect = el.querySelector('.ss-note-project');
  projectSelect.addEventListener('pointerdown', (event) => event.stopPropagation());
  projectSelect.addEventListener('mousedown', (event) => event.stopPropagation());
  projectSelect.addEventListener('change', () => {
    const value = projectSelect.value;
    if (value === '__new__') {
      const name = window.prompt('New project name');
      if (!name || !name.trim()) {
        projectSelect.value = note.projectId || '';
        return;
      }
      ssCreateProject(name, (project) => {
        if (!project) {
          projectSelect.value = note.projectId || '';
          return;
        }
        note.projectId = project.id;
        note.updatedAt = Date.now();
        ssSaveNote(note, () => refreshProjectSelect(el, note));
      });
      return;
    }
    note.projectId = value || null;
    note.updatedAt = Date.now();
    ssSaveNote(note);
  });

  el.querySelector('.ss-note-delete').addEventListener('click', () => {
    el.remove();
    delete notesOnPage[note.id];
    delete noteById[note.id];
    ssDeleteNote(note.id);
  });

  el.querySelector('.ss-note-minimize').addEventListener('click', () => {
    el.remove();
    delete notesOnPage[note.id];
    note.minimized = true;
    note.updatedAt = Date.now();
    ssSaveNote(note);
    renderChip(note);
  });
}

function renderCard(note) {
  if (notesOnPage[note.id] && notesOnPage[note.id].isConnected) return notesOnPage[note.id];
  const el = document.createElement('div');
  el.className = 'ss-sticky-note';
  el.style.width = (note.width || DEFAULT_WIDTH) + 'px';
  el.style.height = (note.height || DEFAULT_HEIGHT) + 'px';
  el.style.background = note.color || COLORS[0];
  el.dataset.noteId = note.id;
  el.innerHTML =
    '<div class="ss-note-handle">' +
      '<div class="ss-note-colors">' +
        COLORS.map((color) => `<button class="ss-color-dot" data-color="${color}" style="background:${color}" title="Change color"></button>`).join('') +
      '</div>' +
      '<div class="ss-note-actions">' +
        '<button class="ss-note-minimize" title="Minimize">−</button>' +
        '<button class="ss-note-delete" title="Delete note">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="ss-note-project-row">' +
      '<select class="ss-note-project" title="Tag with a project" aria-label="Project">' +
        '<option value="">No project</option>' +
      '</select>' +
    '</div>' +
    `<textarea class="ss-note-text" placeholder="Write a note...">${ssEscapeHtml(note.text || '')}</textarea>` +
    '<div class="ss-note-resize" title="Drag to resize"></div>';
  if (!placeNote(el, note)) return null;
  notesOnPage[note.id] = el;
  wireCard(el, note);
  refreshProjectSelect(el, note);
  return el;
}

function renderChip(note) {
  if (minimizedChips[note.id] && minimizedChips[note.id].isConnected) return minimizedChips[note.id];
  const chip = document.createElement('div');
  chip.className = 'ss-chip';
  chip.dataset.noteId = note.id;
  chip.title = 'Click to restore this sticky note';
  chip.innerHTML =
    `<span class="ss-chip-dot" style="background:${note.color || COLORS[0]}"></span>` +
    `<span class="ss-chip-text">${ssEscapeHtml(note.text && note.text.trim() ? note.text : '(empty note)')}</span>` +
    '<button class="ss-chip-delete" title="Delete note">✕</button>';
  chip.addEventListener('click', () => {
    chip.remove();
    delete minimizedChips[note.id];
    note.minimized = false;
    note.updatedAt = Date.now();
    ssSaveNote(note);
    const card = renderCard(note);
    if (card) card.querySelector('.ss-note-text').focus();
  });
  chip.querySelector('.ss-chip-delete').addEventListener('click', (event) => {
    event.stopPropagation();
    chip.remove();
    delete minimizedChips[note.id];
    delete noteById[note.id];
    ssDeleteNote(note.id);
  });
  getTray().appendChild(chip);
  minimizedChips[note.id] = chip;
  return chip;
}

function renderNote(note) {
  noteById[note.id] = note;
  let dirty = false;
  if (note.pageKey !== pageKey) {
    note.pageKey = pageKey;
    dirty = true;
  }
  const anchor = note.pdfAnchor;
  const hasAnchor =
    anchor &&
    Number.isFinite(Number(anchor.page)) &&
    Number.isFinite(Number(anchor.xRatio)) &&
    Number.isFinite(Number(anchor.yRatio));
  if (!hasAnchor) {
    const stack = Object.values(noteById).filter((item) => item !== note && item.pdfAnchor).length;
    note.pdfAnchor = {
      page: 1,
      xRatio: clamp(0.08 + (stack % 4) * 0.04, 0, 0.7),
      yRatio: clamp(0.08 + (stack % 5) * 0.06, 0, 0.75),
    };
    dirty = true;
  }
  if (dirty) {
    note.updatedAt = Date.now();
    ssSaveNote(note);
  }
  if (note.minimized) return renderChip(note);
  return renderCard(note);
}

function clearNoteUi() {
  Object.keys(notesOnPage).forEach((id) => {
    notesOnPage[id].remove();
    delete notesOnPage[id];
  });
  Object.keys(minimizedChips).forEach((id) => {
    if (!noteById[id] || !noteById[id].minimized) {
      minimizedChips[id].remove();
      delete minimizedChips[id];
    }
  });
}

function mountAllNotes() {
  clearNoteUi();
  Object.values(noteById).forEach((note) => {
    if (belongsHere(note)) renderNote(note);
  });
}

function createNewNote() {
  if (!viewerReady) {
    pendingAdds += 1;
    return;
  }
  const stack = Object.keys(notesOnPage).length % 4;
  const page = mostVisiblePage();
  const note = {
    id: ssGenerateId(),
    pageKey,
    url: pageUrl,
    title: pageTitle,
    text: '',
    color: COLORS[0],
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    x: 48,
    y: 48,
    pdfAnchor: {
      page,
      xRatio: clamp(0.08 + stack * 0.04, 0, 0.7),
      yRatio: clamp(0.08 + stack * 0.05, 0, 0.7),
    },
    minimized: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    projectId: null,
    tags: [],
    archived: false,
    sourceAuthor: null,
    sourcePublishedAt: null,
  };
  noteById[note.id] = note;
  ssSaveNote(note, () => {
    const el = renderCard(note);
    if (!el) return;
    const pageEl = el.closest('.ss-pdf-page');
    if (pageEl) pageEl.scrollIntoView({ block: 'nearest' });
    el.querySelector('.ss-note-text').focus();
  });
}

function flushPendingAdds() {
  viewerReady = true;
  while (pendingAdds > 0) {
    pendingAdds -= 1;
    createNewNote();
  }
}

function viewerIsLarge() {
  return window.innerWidth >= 280 && window.innerHeight >= 200;
}

function connectPdfPort() {
  if (pdfPort) return;
  try {
    pdfPort = chrome.runtime.connect({ name: 'ss-pdf' });
    pdfPort.onMessage.addListener((message) => {
      if (!message || message.type !== 'ADD_NOTE') return;
      if (embedded && !viewerIsLarge()) return;
      createNewNote();
    });
    pdfPort.onDisconnect.addListener(() => {
      pdfPort = null;
      if (!chrome.runtime?.id) return;
      setTimeout(connectPdfPort, 400);
    });
    pdfPort.postMessage({
      type: 'meta',
      embedded,
      large: !embedded || viewerIsLarge(),
    });
  } catch (e) {
    pdfPort = null;
    setTimeout(connectPdfPort, 800);
  }
}

function wireStorage() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.notes) return;
    const incoming = changes.notes.newValue || {};
    Object.keys(notesOnPage).forEach((id) => {
      if (!incoming[id] || !belongsHere(incoming[id])) {
        notesOnPage[id].remove();
        delete notesOnPage[id];
        delete noteById[id];
      } else if (notesOnPage[id].isConnected) {
        refreshProjectSelect(notesOnPage[id], incoming[id]);
      }
    });
    Object.keys(minimizedChips).forEach((id) => {
      if (!incoming[id] || !belongsHere(incoming[id])) {
        minimizedChips[id].remove();
        delete minimizedChips[id];
        delete noteById[id];
      }
    });
    Object.values(incoming).forEach((note) => {
      if (!belongsHere(note) || notesOnPage[note.id] || minimizedChips[note.id]) return;
      renderNote(note);
    });
  });
}

document.getElementById('ss-zoom-in').addEventListener('click', () => {
  changeScale(0.15);
});
document.getElementById('ss-zoom-out').addEventListener('click', () => {
  changeScale(-0.15);
});
document.getElementById('ss-pdf-scroll').addEventListener('scroll', () => {
  updatePageLabel();
}, { passive: true });

async function loadDocument() {
  const mime = mimeApi();
  if (!mime || !mime.getStreamInfo) {
    showMessage('Sticky notes can attach to PDFs in Chrome 151 and newer. Update Chrome, then open this PDF again.');
    return;
  }

  let streamInfo;
  try {
    streamInfo = await mime.getStreamInfo();
  } catch (err) {
    showMessage('This viewer opens when you view a PDF. Go back and open the file again.');
    return;
  }

  embedded = Boolean(streamInfo.embedded);
  if (embedded) document.body.classList.add('ss-pdf-embedded');
  pageUrl = streamInfo.originalUrl || location.href;
  pageKey = ssNormalizePageKey(pageUrl);
  pageTitle = filenameFromDisposition(streamInfo.responseHeaders) || titleFromUrl(pageUrl) || 'PDF';
  document.title = pageTitle;
  document.getElementById('ss-pdf-title').textContent = pageTitle;
  document.getElementById('ss-pdf-title').title = pageUrl;

  connectPdfPort();
  window.addEventListener('resize', () => {
    if (!embedded || viewerIsLarge()) ensureQuickAdd();
    if (pdfPort) {
      try {
        pdfPort.postMessage({ type: 'meta', embedded, large: !embedded || viewerIsLarge() });
      } catch (e) {
        /* port closed */
      }
    }
  });
  wireStorage();
  ensureQuickAdd();

  let bytes;
  try {
    const response = await fetch(streamInfo.streamUrl);
    if (!response.ok) throw new Error('Unreadable PDF response');
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (err) {
    await mime.abortAndFallbackToNativeHandler();
    return;
  }

  try {
    const openOptions = {
      cMapUrl: chrome.runtime.getURL('pdf/vendor/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: chrome.runtime.getURL('pdf/vendor/standard_fonts/'),
    };
    try {
      pdfDoc = await getDocument({
        ...openOptions,
        data: bytes.slice(0),
        wasmUrl: chrome.runtime.getURL('pdf/vendor/wasm/'),
        useWasm: true,
      }).promise;
    } catch (err) {
      if (err && (err.name === 'PasswordException' || err.name === 'InvalidPDFException')) throw err;
      pdfDoc = await getDocument({
        ...openOptions,
        data: bytes.slice(0),
        useWasm: false,
      }).promise;
    }
    if (!pdfDoc.numPages) throw new Error('Empty PDF');
    await new Promise((resolve) => {
      ssGetAllNotes((all) => {
        Object.values(all).forEach((note) => {
          if (belongsHere(note)) noteById[note.id] = note;
        });
        resolve();
      });
    });
    showMessage('');
    await fitWidthAndRender();
    flushPendingAdds();
  } catch (err) {
    try {
      await mime.abortAndFallbackToNativeHandler();
    } catch (fallbackErr) {
      showMessage('Stay Sticky could not open this PDF. Reload the file to use Chrome’s viewer.');
    }
  }
}

loadDocument();
