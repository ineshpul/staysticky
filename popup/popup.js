let currentTab = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTab = tabs[0];
    document.getElementById('ssAddNoteBtn').addEventListener('click', onAddNote);
    document.getElementById('ssCreateProjectBtn').addEventListener('click', onCreateProject);
    renderBank();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.notes || changes.projects)) renderBank();
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

function onCreateProject() {
  const input = document.getElementById('ssNewProjectName');
  const name = (input.value || '').trim();
  if (!name) return;
  ssCreateProject(name, () => {
    input.value = '';
    renderBank();
  });
}

function renderBank() {
  ssGetAllNotes((all) => {
    ssGetAllProjects((projects) => {
      const notes = Object.values(all).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      const countEl = document.getElementById('ssNoteCount');
      const listEl = document.getElementById('ssBankList');
      const emptyEl = document.getElementById('ssEmptyState');
      const projectList = document.getElementById('ssProjectList');

      countEl.textContent = notes.length ? String(notes.length) : '';
      listEl.innerHTML = '';
      projectList.innerHTML = '';

      const sortedProjects = ssSortedProjects(projects);
      if (!sortedProjects.length) {
        projectList.innerHTML = '<p class="ss-empty-inline">No projects yet. Create one, then tag notes.</p>';
      } else {
        sortedProjects.forEach((p) => {
          const row = document.createElement('div');
          row.className = 'ss-project-row';
          row.innerHTML =
            `<span class="ss-project-dot" style="background:${p.color || '#FFF59D'}"></span>` +
            `<span class="ss-project-name">${ssEscapeHtml(p.name)}</span>`;
          projectList.appendChild(row);
        });
      }

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
          groupEl.appendChild(buildNoteItem(note, projects));
        });

        listEl.appendChild(groupEl);
      });
    });
  });
}

function buildNoteItem(note, projects) {
  const item = document.createElement('div');
  item.className = 'ss-note-item';

  const swatch = document.createElement('div');
  swatch.className = 'ss-note-swatch';
  swatch.style.background = note.color || '#FFF59D';

  const body = document.createElement('div');
  body.className = 'ss-note-body';

  const snippet = document.createElement('div');
  snippet.className = 'ss-note-snippet';
  snippet.textContent = note.text && note.text.trim() ? note.text : '(empty note)';

  const select = document.createElement('select');
  select.className = 'ss-note-project-select';
  select.title = 'Tag with a project';

  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'No project';
  select.appendChild(none);

  ssSortedProjects(projects).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (note.projectId === p.id) opt.selected = true;
    select.appendChild(opt);
  });

  const createOpt = document.createElement('option');
  createOpt.value = '__new__';
  createOpt.textContent = '+ New project…';
  select.appendChild(createOpt);

  if (note.projectId && !projects[note.projectId]) {
    select.value = '';
  }

  select.addEventListener('click', (e) => e.stopPropagation());
  select.addEventListener('change', (e) => {
    e.stopPropagation();
    const value = select.value;
    if (value === '__new__') {
      const name = window.prompt('New project name');
      if (!name || !name.trim()) {
        select.value = note.projectId || '';
        return;
      }
      ssCreateProject(name, (project) => {
        if (!project) {
          select.value = note.projectId || '';
          return;
        }
        note.projectId = project.id;
        note.updatedAt = Date.now();
        ssSaveNote(note, renderBank);
      });
      return;
    }
    note.projectId = value || null;
    note.updatedAt = Date.now();
    ssSaveNote(note, renderBank);
  });

  body.appendChild(snippet);
  body.appendChild(select);

  const del = document.createElement('button');
  del.className = 'ss-note-item-delete';
  del.title = 'Delete note';
  del.textContent = '✕';

  item.appendChild(swatch);
  item.appendChild(body);
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
