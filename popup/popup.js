let currentTab = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0];
    document.getElementById('ssAddNoteBtn').addEventListener('click', onAddNote);
    renderBank();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.notes) renderBank();
  });
}

function onAddNote() {
  const errorEl = document.getElementById('ssAddNoteError');
  errorEl.hidden = true;

  if (!currentTab || !/^https?:/.test(currentTab.url || '')) {
    errorEl.textContent = "Sticky notes can't be added on this page.";
    errorEl.hidden = false;
    return;
  }

  chrome.tabs.sendMessage(currentTab.id, { type: 'ADD_NOTE' }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      errorEl.textContent = 'Reload the page and try again.';
      errorEl.hidden = false;
      return;
    }
    window.close();
  });
}

function renderBank() {
  ssGetAllNotes((all) => {
    const notes = Object.values(all).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const countEl = document.getElementById('ssNoteCount');
    const listEl = document.getElementById('ssBankList');
    const emptyEl = document.getElementById('ssEmptyState');

    countEl.textContent = notes.length ? String(notes.length) : '';
    listEl.innerHTML = '';

    if (!notes.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const groups = {};
    const order = [];
    notes.forEach((n) => {
      if (!groups[n.pageKey]) {
        groups[n.pageKey] = [];
        order.push(n.pageKey);
      }
      groups[n.pageKey].push(n);
    });

    order.forEach((pageKey) => {
      const group = groups[pageKey];
      const site = group[0];

      const groupEl = document.createElement('div');
      groupEl.className = 'ss-group';

      const titleEl = document.createElement('div');
      titleEl.className = 'ss-group-title';
      titleEl.title = site.url;
      titleEl.textContent = site.title || site.url;
      groupEl.appendChild(titleEl);

      group.forEach((note) => {
        groupEl.appendChild(buildNoteItem(note));
      });

      listEl.appendChild(groupEl);
    });
  });
}

function buildNoteItem(note) {
  const item = document.createElement('div');
  item.className = 'ss-note-item';

  const swatch = document.createElement('div');
  swatch.className = 'ss-note-swatch';
  swatch.style.background = note.color || '#FFF59D';

  const snippet = document.createElement('div');
  snippet.className = 'ss-note-snippet';
  snippet.textContent = note.text && note.text.trim() ? note.text : '(empty note)';

  const del = document.createElement('button');
  del.className = 'ss-note-item-delete';
  del.title = 'Delete note';
  del.textContent = '✕';

  item.appendChild(swatch);
  item.appendChild(snippet);
  item.appendChild(del);

  item.addEventListener('click', () => {
    chrome.tabs.create({ url: note.url });
  });

  del.addEventListener('click', (e) => {
    e.stopPropagation();
    ssDeleteNote(note.id, renderBank);
  });

  return item;
}
