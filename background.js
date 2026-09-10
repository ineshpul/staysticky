// Stay Sticky background service worker.
// Bridges chrome.storage.local notes with the companion web app (Vercel)
// via chrome.runtime external messaging.

function getAllNotes() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ notes: {} }, (data) => {
      resolve(data.notes || {});
    });
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

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender?.origin || "";
  const allowed =
    origin.startsWith("http://localhost:") ||
    origin.endsWith(".vercel.app") ||
    origin.includes("staysticky");

  if (!allowed) {
    sendResponse({ ok: false, message: "Origin not allowed." });
    return false;
  }

  if (message?.type === "SS_WEB_GET_NOTES" || message?.type === "SS_WEB_REQUEST_SYNC") {
    getAllNotes()
      .then((notes) => {
        sendResponse({
          ok: true,
          message: "Notes loaded from extension storage.",
          notes: notesArray(notes),
          syncedAt: Date.now(),
        });
      })
      .catch((err) => {
        sendResponse({ ok: false, message: err?.message || "Failed to read notes." });
      });
    return true;
  }

  if (message?.type === "SS_WEB_PING") {
    sendResponse({ ok: true, message: "Stay Sticky extension online.", version: "1.0.0" });
    return false;
  }

  sendResponse({ ok: false, message: "Unknown message type." });
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Stay Sticky ready for web library sync.");
});
