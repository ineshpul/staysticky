// Shared helpers used by both the content script and the popup.
// Loaded as a plain classic script (no modules) so it works in both contexts.

function ssNormalizePageKey(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const driveFile = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (
      driveFile &&
      (host === 'drive.google.com' ||
        host === 'drive.usercontent.google.com' ||
        host.endsWith('.googleusercontent.com'))
    ) {
      return 'https://drive.google.com/file/d/' + driveFile[1];
    }
    const googleDoc = u.pathname.match(
      /\/(document|spreadsheets|presentation|drawings)\/d\/([^/]+)/
    );
    if (googleDoc && host === 'docs.google.com') {
      return u.origin + '/' + googleDoc[1] + '/d/' + googleDoc[2];
    }
    const id = u.searchParams.get('id') || u.searchParams.get('docid');
    if (id && (host === 'drive.google.com' || host === 'drive.usercontent.google.com' || host.endsWith('.googleusercontent.com'))) {
      return 'https://drive.google.com/file/d/' + id;
    }
    if (id && host === 'docs.google.com') {
      return u.origin + u.pathname + '?id=' + id;
    }
    return u.origin + u.pathname;
  } catch (e) {
    return url;
  }
}

// Older notes were keyed by the raw path (`/view`, `/edit`). Those still count
// as the same file as the canonical key.
function ssPageKeyAliases(url) {
  const aliases = new Set([ssNormalizePageKey(url)]);
  try {
    const u = new URL(url);
    if (
      /\/file\/d\/[^/]+/.test(u.pathname) ||
      /\/(document|spreadsheets|presentation|drawings)\/d\/[^/]+/.test(u.pathname)
    ) {
      aliases.add(u.origin + u.pathname);
    }
  } catch (e) {
    /* keep the canonical key only */
  }
  return aliases;
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

function ssGetAllProjects(callback) {
  chrome.storage.local.get({ projects: {} }, (data) => callback(data.projects || {}));
}

function ssSaveProject(project, callback) {
  ssGetAllProjects((projects) => {
    projects[project.id] = project;
    chrome.storage.local.set({ projects }, callback || (() => {}));
  });
}

function ssDeleteProject(id, callback) {
  ssGetAllProjects((projects) => {
    delete projects[id];
    chrome.storage.local.set({ projects }, () => {
      ssGetAllNotes((notes) => {
        let changed = false;
        Object.keys(notes).forEach((noteId) => {
          if (notes[noteId].projectId === id) {
            notes[noteId] = {
              ...notes[noteId],
              projectId: null,
              updatedAt: Date.now(),
            };
            changed = true;
          }
        });
        if (!changed) {
          (callback || (() => {}))();
          return;
        }
        chrome.storage.local.set({ notes }, callback || (() => {}));
      });
    });
  });
}

function ssCreateProject(name, callback) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    (callback || (() => {}))(null);
    return;
  }
  ssGetAllProjects((projects) => {
    const existing = Object.values(projects).find(
      (p) => (p.name || '').toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      (callback || (() => {}))(existing);
      return;
    }
    const colors = ['#FFF59D', '#F8BBD0', '#BBDEFB', '#C8E6C9', '#FFE0B2'];
    const count = Object.keys(projects).length;
    const project = {
      id: 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      name: trimmed,
      color: colors[count % colors.length],
      summary: null,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    ssSaveProject(project, () => (callback || (() => {}))(project));
  });
}

function ssSortedProjects(projectsMap) {
  return Object.values(projectsMap || {}).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  );
}
