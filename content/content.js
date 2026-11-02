// Stay Sticky content script.
// Renders sticky notes for the current page and keeps them in sync with
// chrome.storage.local, so a note placed here reappears in the same spot
// with the same text every time this page is revisited.

(function () {
  function isCompanionSite() {
    try {
      const u = new URL(location.href);
      const localDev =
        (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.port === '3000';
      return localDev || u.hostname.includes('staysticky');
    } catch (e) {
      return false;
    }
  }

  function notesList(notes) {
    return Object.values(notes || {}).map((note) => ({
      ...note,
      projectId: note.projectId || null,
      tags: note.tags || [],
      archived: Boolean(note.archived),
      anchorText: note.anchorText || null,
      snapshotUrl: note.snapshotUrl || null,
      sourceAuthor: note.sourceAuthor || null,
      sourcePublishedAt: note.sourcePublishedAt || null,
    }));
  }

  function projectsList(projects) {
    return Object.values(projects || {}).map((project) => ({
      id: project.id,
      name: project.name || 'Untitled',
      color: project.color || '#FFF59D',
      summary: project.summary || null,
      tags: Array.isArray(project.tags) ? project.tags : [],
      createdAt: Number(project.createdAt) || Date.now(),
      updatedAt: Number(project.updatedAt) || Date.now(),
    }));
  }

  function replyToWeb(requestId, payload) {
    window.postMessage(
      { source: 'staysticky-extension', requestId, ...payload },
      location.origin,
    );
  }

  function handleWebMessage(data) {
    const type = data.type;
    if (type === 'SS_WEB_GET_NOTES' || type === 'SS_WEB_REQUEST_SYNC') {
      ssGetAllNotes((notes) => {
        ssGetAllProjects((projects) => {
          replyToWeb(data.requestId, {
            ok: true,
            message: 'Notes and projects loaded from extension storage.',
            notes: notesList(notes),
            projects: projectsList(projects),
          });
        });
      });
      return;
    }
    if (type === 'SS_WEB_UPSERT_NOTES') {
      const incoming = Array.isArray(data.notes) ? data.notes : [];
      ssGetAllNotes((notes) => {
        incoming.forEach((n) => {
          if (!n || !n.id) return;
          notes[n.id] = { ...(notes[n.id] || {}), ...n, id: n.id };
        });
        chrome.storage.local.set({ notes }, () => {
          replyToWeb(data.requestId, { ok: true, message: 'Updated notes.' });
        });
      });
      return;
    }
    if (type === 'SS_WEB_UPSERT_PROJECTS') {
      const incoming = Array.isArray(data.projects) ? data.projects : [];
      ssGetAllProjects((projects) => {
        incoming.forEach((p) => {
          if (!p || !p.id) return;
          projects[p.id] = { ...(projects[p.id] || {}), ...p, id: p.id };
        });
        chrome.storage.local.set({ projects }, () => {
          replyToWeb(data.requestId, { ok: true, message: 'Updated projects.' });
        });
      });
      return;
    }
    if (type === 'SS_WEB_DELETE_NOTE' && data.noteId) {
      ssDeleteNote(data.noteId, () => {
        replyToWeb(data.requestId, { ok: true, message: 'Note deleted.' });
      });
      return;
    }
    if (type === 'SS_WEB_DELETE_PROJECT' && data.projectId) {
      ssDeleteProject(data.projectId, () => {
        replyToWeb(data.requestId, { ok: true, message: 'Project deleted.' });
      });
      return;
    }
    replyToWeb(data.requestId, { ok: false, message: 'Unknown message type.' });
  }

  // The companion site cannot read chrome.storage directly. On Stay Sticky
  // origins, expose notes over same-origin postMessage so new stickies sync
  // even if the background worker is asleep.
  if (isCompanionSite()) {
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.origin !== location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'staysticky-web' || !data.requestId) return;
      handleWebMessage(data);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || (!changes.notes && !changes.projects)) return;
      ssGetAllNotes((notes) => {
        ssGetAllProjects((projects) => {
          window.postMessage(
            {
              source: 'staysticky-extension',
              type: 'SS_EXTENSION_CHANGED',
              ok: true,
              notes: notesList(notes),
              projects: projectsList(projects),
            },
            location.origin,
          );
        });
      });
    });
    return;
  }

  const COLORS = ['#FFF59D', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2'];
  const DEFAULT_WIDTH = 220;
  const DEFAULT_HEIGHT = 190;
  const MIN_WIDTH = 160;
  const MIN_HEIGHT = 120;

  const pageKey = ssNormalizePageKey(location.href);
  const pageKeyAliases = ssPageKeyAliases(location.href);
  const coveredViewer = isCoveredViewerPage();
  const notesOnPage = {}; // id -> card element
  const minimizedChips = {}; // id -> chip element
  let tray = null;
  let overlayHost = null;
  let overlayObserver = null;

  // Google's file preview covers the page. Notes go in a top-layer host so
  // they stay visible above Drive, Docs, and Gmail.
  function isCoveredViewerPage() {
    const host = location.hostname;
    return (
      host === 'drive.google.com' ||
      host === 'docs.google.com' ||
      host === 'drive.usercontent.google.com' ||
      host === 'mail.google.com' ||
      host.endsWith('.googleusercontent.com')
    );
  }

  function belongsOnPage(note) {
    return Boolean(note && pageKeyAliases.has(note.pageKey));
  }

  function getUiRoot() {
    if (!coveredViewer) return document.body || document.documentElement;
    if (!overlayHost) {
      overlayHost = document.createElement('div');
      overlayHost.id = 'ss-overlay-host';
      overlayHost.setAttribute('popover', 'manual');
      overlayHost.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;overflow:visible;pointer-events:none;z-index:2147483646;';
    }
    if (!overlayHost.isConnected && document.documentElement) {
      document.documentElement.appendChild(overlayHost);
      try {
        overlayHost.showPopover();
      } catch (e) {
        /* popover is optional; the fixed host still sits above the page */
      }
    }
    if (!overlayObserver && document.documentElement) {
      overlayObserver = new MutationObserver(() => {
        if (overlayHost && !overlayHost.isConnected && document.documentElement) {
          document.documentElement.appendChild(overlayHost);
          try {
            overlayHost.showPopover();
          } catch (e) {
            /* already showing, or popover is unavailable */
          }
        }
      });
      overlayObserver.observe(document.documentElement, { childList: true });
    }
    return overlayHost;
  }
  let quickAdd = null;
  let pageInvoked = false;

  // A locked note is "universal": it shows on every page, not just the one
  // it was created on. A note with stuck === false has been taken off every
  // page and lives only in the bank until it's stuck somewhere again.
  // (stuck is treated as true when absent, for notes saved before this flag existed.)
  function belongsOnThisPage(note) {
    if (note.stuck === false) return false;
    return note.locked || belongsOnPage(note);
  }

  // Toggles lock state. Unlocking a note on a page other than its current
  // home re-homes it here — lock it, carry it (minimized) to wherever you
  // need it, then unlock to drop it on that page.
  function toggleLock(note) {
    note.locked = !note.locked;
    if (!note.locked && note.pageKey !== pageKey) {
      note.pageKey = pageKey;
      note.url = location.href;
      note.title = document.title;
      note.x = Math.round(window.scrollX + 120);
      note.y = Math.round(window.scrollY + 120);
    }
    note.updatedAt = Date.now();
    ssSaveNote(note);
  }

  // Taking a note off a page never deletes it — it just drops back into the
  // bank (unstuck) so it can be stuck onto a page again later. Permanent
  // deletion only happens from the bank's trash icon (or the web library).
  function unstickNote(note) {
    if (notesOnPage[note.id]) {
      notesOnPage[note.id].remove();
      delete notesOnPage[note.id];
    }
    if (minimizedChips[note.id]) {
      minimizedChips[note.id].remove();
      delete minimizedChips[note.id];
    }
    note.stuck = false;
    note.locked = false;
    note.updatedAt = Date.now();
    ssSaveNote(note);
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function markPageInvoked() {
    pageInvoked = true;
    ensureQuickAdd();
  }

  function pageHasNotes() {
    return Object.keys(notesOnPage).length > 0 || Object.keys(minimizedChips).length > 0;
  }

  /** Little sticky in the top-right after Stay Sticky is used on this page. */
  function ensureQuickAdd() {
    if (!pageInvoked && !pageHasNotes()) return;
    if (quickAdd) {
      if (!quickAdd.isConnected) getUiRoot().appendChild(quickAdd);
      quickAdd.hidden = false;
      syncTrayOffset();
      return;
    }
    quickAdd = document.createElement('button');
    quickAdd.type = 'button';
    quickAdd.id = 'ss-quick-add';
    quickAdd.className = 'ss-quick-add';
    quickAdd.title = 'Add sticky note';
    quickAdd.setAttribute('aria-label', 'Add sticky note');
    quickAdd.innerHTML =
      '<span class="ss-quick-add-bar" aria-hidden="true"></span>' +
      '<span class="ss-quick-add-plus" aria-hidden="true">+</span>';
    quickAdd.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      createNewNote();
    });
    getUiRoot().appendChild(quickAdd);
    syncTrayOffset();
  }

  function syncTrayOffset() {
    if (!tray) return;
    tray.classList.toggle('ss-tray-with-quick-add', Boolean(quickAdd && !quickAdd.hidden));
  }

  function getTray() {
    if (!tray) {
      tray = document.createElement('div');
      tray.id = 'ss-tray';
      tray.className = 'ss-tray';

      const handle = document.createElement('div');
      handle.className = 'ss-tray-handle';
      handle.title = 'Drag to move';
      handle.textContent = '⋮⋮';
      tray.appendChild(handle);
      wireTrayDrag(tray, handle);

      const trayEl = tray;
      chrome.storage.local.get({ ssTrayPos: null }, (data) => {
        if (data.ssTrayPos) {
          trayEl.style.left = data.ssTrayPos.left + 'px';
          trayEl.style.top = data.ssTrayPos.top + 'px';
          trayEl.style.right = 'auto';
        }
      });
    }
    if (!tray.isConnected) getUiRoot().appendChild(tray);
    syncTrayOffset();

    return tray;
  }

  function wireTrayDrag(trayEl, handleEl) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handleEl.addEventListener('pointerdown', (e) => {
      dragging = true;
      const rect = trayEl.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      handleEl.setPointerCapture(e.pointerId);
    });

    handleEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      trayEl.style.left = e.clientX - offsetX + 'px';
      trayEl.style.top = e.clientY - offsetY + 'px';
      trayEl.style.right = 'auto';
    });

    handleEl.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      const rect = trayEl.getBoundingClientRect();
      chrome.storage.local.set({ ssTrayPos: { left: rect.left, top: rect.top } });
    });
  }

  // Dispatches to the right representation (full card vs. minimized chip)
  // based on the note's saved state.
  function renderNote(note) {
    if (note.minimized) return renderChip(note);
    return renderCard(note);
  }

  function renderCard(note) {
    if (notesOnPage[note.id]) {
      if (!notesOnPage[note.id].isConnected) getUiRoot().appendChild(notesOnPage[note.id]);
      return notesOnPage[note.id];
    }

    const el = document.createElement('div');
    el.className = 'ss-sticky-note';
    el.style.left = note.x + 'px';
    el.style.top = note.y + 'px';
    el.style.width = (note.width || DEFAULT_WIDTH) + 'px';
    el.style.height = (note.height || DEFAULT_HEIGHT) + 'px';
    el.style.background = note.color || COLORS[0];
    if (coveredViewer) {
      el.classList.add('ss-sticky-note-fixed');
      const maxX = Math.max(16, window.innerWidth - (note.width || DEFAULT_WIDTH) - 16);
      const maxY = Math.max(16, window.innerHeight - 48);
      el.style.left = Math.min(Math.max(note.x || 96, 8), maxX) + 'px';
      el.style.top = Math.min(Math.max(note.y || 96, 8), maxY) + 'px';
    }
    el.dataset.noteId = note.id;

    el.innerHTML =
      '<div class="ss-note-handle">' +
        '<div class="ss-note-colors">' +
          COLORS.map((c) => `<button class="ss-color-dot" data-color="${c}" style="background:${c}" title="Change color"></button>`).join('') +
        '</div>' +
        '<div class="ss-note-actions">' +
          `<button class="ss-note-lock" title="${note.locked ? 'Locked — showing on every page' : 'Lock — show this note on every page'}">${note.locked ? '\u{1F512}' : '\u{1F513}'}</button>` +
          '<button class="ss-note-minimize" title="Minimize">−</button>' +
          '<button class="ss-note-delete" title="Remove from this page (kept in your Sticky Note Bank)">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="ss-note-project-row">' +
        '<select class="ss-note-project" title="Tag with a project" aria-label="Project">' +
          '<option value="">No project</option>' +
        '</select>' +
      '</div>' +
      '<div class="ss-note-toolbar">' +
        '<button class="ss-fmt-btn ss-fmt-bold" data-command="bold" title="Bold (Ctrl/Cmd+B)"><b>B</b></button>' +
        '<button class="ss-fmt-btn ss-fmt-italic" data-command="italic" title="Italic (Ctrl/Cmd+I)"><i>I</i></button>' +
        '<button class="ss-fmt-btn ss-fmt-bullet" data-command="insertUnorderedList" title="Bullet list">☰</button>' +
        '<select class="ss-fmt-size" title="Text size">' +
          '<option value="" selected disabled>Size</option>' +
          '<option value="11px">Small</option>' +
          '<option value="13px">Normal</option>' +
          '<option value="17px">Large</option>' +
        '</select>' +
      '</div>' +
      '<div class="ss-note-text" contenteditable="true" data-placeholder="Write a note..."></div>' +
      '<div class="ss-note-resize" title="Drag to resize"></div>';

    el.querySelector('.ss-note-text').innerHTML = note.html != null ? note.html : ssEscapeHtml(note.text || '');

    getUiRoot().appendChild(el);
    notesOnPage[note.id] = el;
    wireCardEvents(el, note);
    refreshProjectSelect(el, note);
    return el;
  }

  function refreshProjectSelect(el, note) {
    const select = el.querySelector('.ss-note-project');
    if (!select) return;
    ssGetAllProjects((projects) => {
      const current = note.projectId || '';
      select.innerHTML = '<option value="">No project</option>';
      ssSortedProjects(projects).forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === current) opt.selected = true;
        select.appendChild(opt);
      });
      const createOpt = document.createElement('option');
      createOpt.value = '__new__';
      createOpt.textContent = '+ New project…';
      select.appendChild(createOpt);
      if (current && !projects[current]) {
        select.value = '';
      } else {
        select.value = current;
      }
    });
  }

  function refreshAllProjectSelects() {
    Object.keys(notesOnPage).forEach((id) => {
      const el = notesOnPage[id];
      const noteId = el?.dataset?.noteId;
      if (!noteId) return;
      ssGetAllNotes((notes) => {
        const note = notes[noteId];
        if (note) refreshProjectSelect(el, note);
      });
    });
  }

  function wireCardEvents(el, note) {
    const handle = el.querySelector('.ss-note-handle');
    const textEl = el.querySelector('.ss-note-text');
    const resizeHandle = el.querySelector('.ss-note-resize');

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || e.target.closest('select')) return;
      dragging = true;
      offsetX = (coveredViewer ? e.clientX : e.pageX) - el.offsetLeft;
      offsetY = (coveredViewer ? e.clientY : e.pageY) - el.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      el.style.left = (coveredViewer ? e.clientX : e.pageX) - offsetX + 'px';
      el.style.top = (coveredViewer ? e.clientY : e.pageY) - offsetY + 'px';
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

    const saveText = debounce(() => {
      note.html = textEl.innerHTML;
      note.text = ssHtmlToText(note.html);
      note.updatedAt = Date.now();
      ssSaveNote(note);
    }, 400);

    textEl.addEventListener('input', saveText);

    textEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const inList = document.queryCommandState('insertUnorderedList') || document.queryCommandState('insertOrderedList');
      if (inList) {
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      } else if (!e.shiftKey) {
        document.execCommand('insertHTML', false, '&emsp;');
      }
      saveText();
    });

    el.querySelectorAll('.ss-fmt-btn').forEach((btn) => {
      // Prevent the button from stealing focus, which would otherwise
      // collapse the text selection the command is meant to apply to.
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        textEl.focus();
        document.execCommand(btn.dataset.command);
        saveText();
      });
    });

    const sizeSelect = el.querySelector('.ss-fmt-size');
    let savedRange = null;

    sizeSelect.addEventListener('mousedown', () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && textEl.contains(sel.anchorNode)) {
        savedRange = sel.getRangeAt(0).cloneRange();
      }
    });

    sizeSelect.addEventListener('change', () => {
      const size = sizeSelect.value;
      sizeSelect.selectedIndex = 0;
      if (!size) return;

      textEl.focus();
      const sel = window.getSelection();
      if (savedRange) {
        sel.removeAllRanges();
        sel.addRange(savedRange);
      }

      // execCommand('fontSize') only supports a fixed 1-7 scale, so apply a
      // throwaway size (7) and swap the resulting <font> tags for styled
      // <span>s with the actual pixel size we want.
      document.execCommand('fontSize', false, '7');
      textEl.querySelectorAll('font[size="7"]').forEach((font) => {
        const span = document.createElement('span');
        span.style.fontSize = size;
        while (font.firstChild) span.appendChild(font.firstChild);
        font.replaceWith(span);
      });

      saveText();
    });

    el.querySelectorAll('.ss-color-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        note.color = dot.dataset.color;
        el.style.background = note.color;
        note.updatedAt = Date.now();
        ssSaveNote(note);
      });
    });

    const projectSelect = el.querySelector('.ss-note-project');
    if (projectSelect) {
      projectSelect.addEventListener('pointerdown', (e) => e.stopPropagation());
      projectSelect.addEventListener('click', (e) => e.stopPropagation());
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
    }

    el.querySelector('.ss-note-delete').addEventListener('click', () => {
      unstickNote(note);
    });

    el.querySelector('.ss-note-minimize').addEventListener('click', () => {
      minimizeNote(note, el);
    });

    const lockBtn = el.querySelector('.ss-note-lock');
    lockBtn.addEventListener('click', () => {
      toggleLock(note);
      lockBtn.textContent = note.locked ? '\u{1F512}' : '\u{1F513}';
      lockBtn.title = note.locked ? 'Locked — showing on every page' : 'Lock — show this note on every page';
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
      `<button class="ss-chip-lock" title="${note.locked ? 'Locked — click to drop it on this page' : 'Lock — carry this note to another page'}">${note.locked ? '\u{1F512}' : '\u{1F513}'}</button>` +
      '<button class="ss-chip-delete" title="Remove from this page (kept in your Sticky Note Bank)">✕</button>';

    chip.addEventListener('click', () => restoreNote(note, chip));
    const chipLockBtn = chip.querySelector('.ss-chip-lock');
    chipLockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLock(note);
      chipLockBtn.textContent = note.locked ? '\u{1F512}' : '\u{1F513}';
      chipLockBtn.title = note.locked ? 'Locked — click to drop it on this page' : 'Lock — carry this note to another page';
    });
    chip.querySelector('.ss-chip-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      unstickNote(note);
    });

    getTray().appendChild(chip);
    minimizedChips[note.id] = chip;
    return chip;
  }

  function scrapePageCitationMeta() {
    function metaContent(...names) {
      for (const name of names) {
        const el =
          document.querySelector(`meta[name="${name}"]`) ||
          document.querySelector(`meta[property="${name}"]`) ||
          document.querySelector(`meta[itemprop="${name}"]`);
        const value = el && el.getAttribute("content");
        if (value && value.trim()) return value.trim();
      }
      return null;
    }

    function normalizeDate(raw) {
      if (!raw) return null;
      const trimmed = String(raw).trim();
      if (/^\d{4}$/.test(trimmed)) return trimmed;
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) return null;
      const y = parsed.getUTCFullYear();
      const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
      const d = String(parsed.getUTCDate()).padStart(2, "0");
      return y + "-" + m + "-" + d;
    }

    const author =
      metaContent(
        "author",
        "citation_author",
        "article:author",
        "dc.creator",
        "DC.creator",
        "twitter:creator"
      ) ||
      (document.querySelector('[rel="author"]') &&
        document.querySelector('[rel="author"]').textContent &&
        document.querySelector('[rel="author"]').textContent.trim()) ||
      null;

    const publishedRaw = metaContent(
      "article:published_time",
      "citation_publication_date",
      "pubdate",
      "publishdate",
      "date",
      "dc.date",
      "DC.date",
      "sailthru.date"
    );

    return {
      sourceAuthor: author ? author.replace(/^by\s+/i, "").trim() : null,
      sourcePublishedAt: normalizeDate(publishedRaw),
    };
  }

  function createNewNote() {
    markPageInvoked();
    const citation = scrapePageCitationMeta();
    const note = {
      id: ssGenerateId(),
      pageKey,
      url: location.href,
      title: document.title,
      text: '',
      html: '',
      color: COLORS[0],
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      x: coveredViewer ? 88 + (Object.keys(notesOnPage).length % 4) * 24 : Math.round(window.scrollX + 120),
      y: coveredViewer ? 88 + (Object.keys(notesOnPage).length % 4) * 24 : Math.round(window.scrollY + 120),
      minimized: false,
      locked: false,
      stuck: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId: null,
      tags: [],
      archived: false,
      sourceAuthor: citation.sourceAuthor,
      sourcePublishedAt: citation.sourcePublishedAt,
    };
    ssSaveNote(note, () => {
      const el = renderCard(note);
      el.querySelector('.ss-note-text').focus();
    });
  }

  function loadNotesForPage() {
    ssGetAllNotes((all) => {
      const onPage = Object.values(all).filter(belongsOnThisPage);
      onPage.forEach((note) => {
        // Migrate old alias keys to the canonical one — but never re-home a
        // locked note that is merely visiting this page.
        if (!note.locked && note.pageKey !== pageKey) {
          note.pageKey = pageKey;
          note.updatedAt = Date.now();
          ssSaveNote(note);
        }
        renderNote(note);
      });
      if (onPage.length) markPageInvoked();
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ADD_NOTE') {
      createNewNote();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'STICK_NOTE') {
      ssGetAllNotes((all) => {
        const note = all[message.noteId];
        if (!note) {
          sendResponse({ ok: false });
          return;
        }
        note.stuck = true;
        note.locked = false;
        note.minimized = false;
        note.pageKey = pageKey;
        note.url = location.href;
        note.title = document.title;
        note.x = Math.round(window.scrollX + 120);
        note.y = Math.round(window.scrollY + 120);
        note.updatedAt = Date.now();
        ssSaveNote(note, () => {
          renderCard(note);
          markPageInvoked();
          sendResponse({ ok: true });
        });
      });
      return true; // async response
    }
  });

  // Keep this page's notes in sync if they're edited/deleted from the popup bank.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.projects) {
      refreshAllProjectSelects();
    }

    if (!changes.notes) return;
    const newNotes = changes.notes.newValue || {};

    Object.keys(notesOnPage).forEach((id) => {
      if (!newNotes[id] || !belongsOnThisPage(newNotes[id])) {
        notesOnPage[id].remove();
        delete notesOnPage[id];
        return;
      }
      refreshProjectSelect(notesOnPage[id], newNotes[id]);
    });
    Object.keys(minimizedChips).forEach((id) => {
      if (!newNotes[id] || !belongsOnThisPage(newNotes[id])) {
        minimizedChips[id].remove();
        delete minimizedChips[id];
      }
    });

    Object.values(newNotes)
      .filter((n) => belongsOnThisPage(n) && !notesOnPage[n.id] && !minimizedChips[n.id])
      .forEach(renderNote);

    if (Object.values(newNotes).some((n) => belongsOnPage(n))) {
      markPageInvoked();
    } else {
      syncTrayOffset();
    }
  });

  loadNotesForPage();
})();
