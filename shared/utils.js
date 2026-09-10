// Shared helpers used by both the content script and the popup.
// Loaded as a plain classic script (no modules) so it works in both contexts.

function ssNormalizePageKey(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch (e) {
    return url;
  }
}

function ssGenerateId() {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function ssGetAllNotes(callback) {
  chrome.storage.local.get({ notes: {} }, (data) => callback(data.notes));
}

function ssSaveNote(note, callback) {
  ssGetAllNotes((notes) => {
    notes[note.id] = note;
    chrome.storage.local.set({ notes }, callback || (() => {}));
  });
}

function ssDeleteNote(id, callback) {
  ssGetAllNotes((notes) => {
    delete notes[id];
    chrome.storage.local.set({ notes }, callback || (() => {}));
  });
}

function ssEscapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
