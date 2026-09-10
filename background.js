// Stay Sticky background service worker.
// Bridges chrome.storage.local notes/projects with the companion web app
// via chrome.runtime external messaging.

function getAllNotes() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ notes: {} }, (data) => {
      resolve(data.notes || {});
    });
  });
}

function setAllNotes(notes) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ notes }, () => resolve());
  });
}

function getAllProjects() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ projects: {} }, (data) => {
      resolve(data.projects || {});
    });
  });
}

function setAllProjects(projects) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ projects }, () => resolve());
  });
}

function notesArray(notesMap) {
  return Object.values(notesMap || {}).map((note) => ({
    ...note,
    projectId: note.projectId || null,
    tags: note.tags || [],
    archived: Boolean(note.archived),
    anchorText: note.anchorText || null,
    snapshotUrl: note.snapshotUrl || null,
  }));
}

function projectsArray(projectsMap) {
  return Object.values(projectsMap || {}).map((project) => ({
    id: project.id,
    name: project.name || "Untitled",
    color: project.color || "#FFF59D",
    summary: project.summary || null,
    tags: Array.isArray(project.tags) ? project.tags : [],
    createdAt: Number(project.createdAt) || Date.now(),
    updatedAt: Number(project.updatedAt) || Date.now(),
  }));
}

function isAllowedOrigin(origin) {
  return (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.endsWith(".vercel.app") ||
    origin.includes("staysticky")
  );
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender?.origin || "";
  if (!isAllowedOrigin(origin)) {
    sendResponse({ ok: false, message: "Origin not allowed." });
    return false;
  }

  if (message?.type === "SS_WEB_GET_NOTES" || message?.type === "SS_WEB_REQUEST_SYNC") {
    Promise.all([getAllNotes(), getAllProjects()])
      .then(([notes, projects]) => {
        sendResponse({
          ok: true,
          message: "Notes and projects loaded from extension storage.",
          notes: notesArray(notes),
          projects: projectsArray(projects),
          syncedAt: Date.now(),
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, message: err?.message || "Failed to read notes." });
      });
    return true;
  }

  if (message?.type === "SS_WEB_UPSERT_NOTES") {
    const incoming = Array.isArray(message.notes) ? message.notes : [];
    getAllNotes()
      .then(async (notes) => {
        for (const n of incoming) {
          if (!n || !n.id) continue;
          const existing = notes[n.id] || {};
          const incomingUpdated = Number(n.updatedAt) || 0;
          const existingUpdated = Number(existing.updatedAt) || 0;
          if (!existing.id || incomingUpdated >= existingUpdated) {
            notes[n.id] = {
              ...existing,
              ...n,
              id: n.id,
              projectId: n.projectId !== undefined ? n.projectId : existing.projectId || null,
              tags: Array.isArray(n.tags) ? n.tags : existing.tags || [],
              archived: Boolean(n.archived),
            };
          } else if (n.projectId && !existing.projectId) {
            notes[n.id] = { ...existing, projectId: n.projectId };
          }
        }
        await setAllNotes(notes);
        sendResponse({
          ok: true,
          message: `Updated ${incoming.length} note(s) in extension storage.`,
          syncedAt: Date.now(),
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, message: err?.message || "Failed to write notes." });
      });
    return true;
  }

  if (message?.type === "SS_WEB_UPSERT_PROJECTS") {
    const incoming = Array.isArray(message.projects) ? message.projects : [];
    getAllProjects()
      .then(async (projects) => {
        for (const p of incoming) {
          if (!p || !p.id) continue;
          const existing = projects[p.id] || {};
          const incomingUpdated = Number(p.updatedAt) || 0;
          const existingUpdated = Number(existing.updatedAt) || 0;
          if (!existing.id || incomingUpdated >= existingUpdated) {
            projects[p.id] = {
              ...existing,
              ...p,
              id: p.id,
              name: p.name || existing.name || "Untitled",
              tags: Array.isArray(p.tags) ? p.tags : existing.tags || [],
            };
          }
        }
        await setAllProjects(projects);
        sendResponse({
          ok: true,
          message: `Updated ${incoming.length} project(s).`,
          syncedAt: Date.now(),
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, message: err?.message || "Failed to write projects." });
      });
    return true;
  }

  if (message?.type === "SS_WEB_DELETE_PROJECT") {
    const projectId = message.projectId;
    if (!projectId) {
      sendResponse({ ok: false, message: "Missing projectId." });
      return false;
    }
    Promise.all([getAllProjects(), getAllNotes()])
      .then(async ([projects, notes]) => {
        delete projects[projectId];
        for (const id of Object.keys(notes)) {
          if (notes[id].projectId === projectId) {
            notes[id] = { ...notes[id], projectId: null, updatedAt: Date.now() };
          }
        }
        await setAllProjects(projects);
        await setAllNotes(notes);
        sendResponse({ ok: true, message: "Project deleted.", syncedAt: Date.now() });
      })
      .catch((err) => {
        sendResponse({ ok: false, message: err?.message || "Failed to delete project." });
      });
    return true;
  }

  if (message?.type === "SS_WEB_PING") {
    sendResponse({ ok: true, message: "Stay Sticky extension online.", version: "1.2.0" });
    return false;
  }

  sendResponse({ ok: false, message: "Unknown message type." });
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Stay Sticky ready for continuous web library sync.");
});
