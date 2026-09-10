// Stay Sticky content script.
// Renders sticky notes for the current page and keeps them in sync with
// chrome.storage.local, so a note placed here reappears in the same spot
// with the same text every time this page is revisited.

(function () {
  const COLORS = ['#FFF59D', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2'];
  const DEFAULT_WIDTH = 220;
  const DEFAULT_HEIGHT = 190;
  const MIN_WIDTH = 160;
  const MIN_HEIGHT = 120;

  const pageKey = ssNormalizePageKey(location.href);
  const notesOnPage = {}; // id -> card element
  const minimizedChips = {}; // id -> chip element
  let tray = null;

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function getTray() {
    if (tray) return tray;
    tray = document.createElement('div');
    tray.id = 'ss-tray';
    tray.className = 'ss-tray';
    document.body.appendChild(tray);
    return tray;
  }

  // Dispatches to the right representation (full card vs. minimized chip)
  // based on the note's saved state.
  function renderNote(note) {
    if (note.minimized) return renderChip(note);
    return renderCard(note);
  }

  function renderCard(note) {
    if (notesOnPage[note.id]) return notesOnPage[note.id];

    const el = document.createElement('div');
    el.className = 'ss-sticky-note';
    el.style.left = note.x + 'px';
    el.style.top = note.y + 'px';
    el.style.width = (note.width || DEFAULT_WIDTH) + 'px';
    el.style.height = (note.height || DEFAULT_HEIGHT) + 'px';
    el.style.background = note.color || COLORS[0];
    el.dataset.noteId = note.id;

    el.innerHTML =
      '<div class="ss-note-handle">' +
        '<div class="ss-note-colors">' +
          COLORS.map((c) => `<button class="ss-color-dot" data-color="${c}" style="background:${c}" title="Change color"></button>`).join('') +
        '</div>' +
        '<div class="ss-note-actions">' +
          '<button class="ss-note-minimize" title="Minimize">−</button>' +
          '<button class="ss-note-delete" title="Delete note">✕</button>' +
        '</div>' +
      '</div>' +
      `<textarea class="ss-note-text" placeholder="Write a note...">${ssEscapeHtml(note.text || '')}</textarea>` +
      '<div class="ss-note-resize" title="Drag to resize"></div>';

    document.body.appendChild(el);
    notesOnPage[note.id] = el;
    wireCardEvents(el, note);
    return el;
  }

  function wireCardEvents(el, note) {
    const handle = el.querySelector('.ss-note-handle');
    const textarea = el.querySelector('.ss-note-text');
    const resizeHandle = el.querySelector('.ss-note-resize');

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      offsetX = e.pageX - el.offsetLeft;
      offsetY = e.pageY - el.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      el.style.left = e.pageX - offsetX + 'px';
      el.style.top = e.pageY - offsetY + 'px';
    });

    handle.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      note.x = el.offsetLeft;
      note.y = el.offsetTop;
      note.updatedAt = Date.now();
      ssSaveNote(note);
    });

    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    resizeHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = el.offsetWidth;
      startH = el.offsetHeight;
      resizeHandle.setPointerCapture(e.pointerId);
    });

    resizeHandle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      e.stopPropagation();
      const newW = Math.max(MIN_WIDTH, startW + (e.clientX - startX));
      const newH = Math.max(MIN_HEIGHT, startH + (e.clientY - startY));
      el.style.width = newW + 'px';
      el.style.height = newH + 'px';
    });

    resizeHandle.addEventListener('pointerup', (e) => {
      if (!resizing) return;
      e.stopPropagation();
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

    el.querySelector('.ss-note-delete').addEventListener('click', () => {
      el.remove();
      delete notesOnPage[note.id];
      ssDeleteNote(note.id);
    });

    el.querySelector('.ss-note-minimize').addEventListener('click', () => {
      minimizeNote(note, el);
    });
  }

  function minimizeNote(note, cardEl) {
    cardEl.remove();
    delete notesOnPage[note.id];
    note.minimized = true;
    note.updatedAt = Date.now();
    ssSaveNote(note);
    renderChip(note);
  }

  function restoreNote(note, chipEl) {
    chipEl.remove();
    delete minimizedChips[note.id];
    note.minimized = false;
    note.updatedAt = Date.now();
    ssSaveNote(note);
    renderCard(note);
  }

  function renderChip(note) {
    if (minimizedChips[note.id]) return minimizedChips[note.id];

    const chip = document.createElement('div');
    chip.className = 'ss-chip';
    chip.dataset.noteId = note.id;
    chip.title = 'Click to restore this sticky note to its spot on the page';

    chip.innerHTML =
      `<span class="ss-chip-dot" style="background:${note.color || COLORS[0]}"></span>` +
      `<span class="ss-chip-text">${ssEscapeHtml(note.text && note.text.trim() ? note.text : '(empty note)')}</span>` +
      '<button class="ss-chip-delete" title="Delete note">✕</button>';

    chip.addEventListener('click', () => restoreNote(note, chip));
    chip.querySelector('.ss-chip-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      chip.remove();
      delete minimizedChips[note.id];
      ssDeleteNote(note.id);
    });

    getTray().appendChild(chip);
    minimizedChips[note.id] = chip;
    return chip;
  }

  function createNewNote() {
    const note = {
      id: ssGenerateId(),
      pageKey,
      url: location.href,
      title: document.title,
      text: '',
      color: COLORS[0],
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      x: Math.round(window.scrollX + 120),
      y: Math.round(window.scrollY + 120),
      minimized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    ssSaveNote(note, () => {
      const el = renderCard(note);
      el.querySelector('.ss-note-text').focus();
    });
  }

  function loadNotesForPage() {
    ssGetAllNotes((all) => {
      Object.values(all)
        .filter((n) => n.pageKey === pageKey)
        .forEach(renderNote);
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ADD_NOTE') {
      createNewNote();
      sendResponse({ ok: true });
    }
  });

  // Keep this page's notes in sync if they're edited/deleted from the popup bank.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.notes) return;
    const newNotes = changes.notes.newValue || {};

    Object.keys(notesOnPage).forEach((id) => {
      if (!newNotes[id]) {
        notesOnPage[id].remove();
        delete notesOnPage[id];
      }
    });
    Object.keys(minimizedChips).forEach((id) => {
      if (!newNotes[id]) {
        minimizedChips[id].remove();
        delete minimizedChips[id];
      }
    });

    Object.values(newNotes)
      .filter((n) => n.pageKey === pageKey && !notesOnPage[n.id] && !minimizedChips[n.id])
      .forEach(renderNote);
  });

  loadNotesForPage();
})();
