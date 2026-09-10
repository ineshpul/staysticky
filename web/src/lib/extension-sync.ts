import type { Note, Project } from "./types";

const EXT_ID_KEY = "ss_extension_id";
const LINKED_KEY = "ss_extension_linked";

export function getSavedExtensionId(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem(EXT_ID_KEY) ||
    process.env.NEXT_PUBLIC_EXTENSION_ID ||
    ""
  ).trim();
}

export function saveExtensionLink(extensionId: string) {
  localStorage.setItem(EXT_ID_KEY, extensionId.trim());
  localStorage.setItem(LINKED_KEY, "1");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ss-extension-link-changed"));
  }
}

export function clearExtensionLink() {
  localStorage.removeItem(LINKED_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ss-extension-link-changed"));
  }
}

export function isExtensionLinked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LINKED_KEY) === "1" && Boolean(getSavedExtensionId());
}

function chromeRuntime() {
  return (globalThis as unknown as { chrome?: typeof chrome }).chrome?.runtime;
}

export function normalizeExtensionNote(n: Record<string, unknown>): Note {
  return {
    id: String(n.id),
    pageKey: String(n.pageKey || ""),
    url: String(n.url || ""),
    title: String(n.title || ""),
    text: String(n.text || ""),
    color: String(n.color || "#FFF59D"),
    width: typeof n.width === "number" ? n.width : undefined,
    height: typeof n.height === "number" ? n.height : undefined,
    x: typeof n.x === "number" ? n.x : undefined,
    y: typeof n.y === "number" ? n.y : undefined,
    minimized: Boolean(n.minimized),
    createdAt: Number(n.createdAt) || Date.now(),
    updatedAt: Number(n.updatedAt) || Date.now(),
    projectId: (n.projectId as string) || null,
    tags: Array.isArray(n.tags) ? (n.tags as string[]) : [],
    archived: Boolean(n.archived),
    anchorText: (n.anchorText as string) || null,
    snapshotUrl: (n.snapshotUrl as string) || null,
    sourceAuthor: (n.sourceAuthor as string) || null,
    sourcePublishedAt: (n.sourcePublishedAt as string) || null,
  };
}

export function normalizeExtensionProject(p: Record<string, unknown>): Project {
  return {
    id: String(p.id),
    name: String(p.name || "Untitled"),
    color: String(p.color || "#FFF59D"),
    summary: (p.summary as string) || null,
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    createdAt: Number(p.createdAt) || Date.now(),
    updatedAt: Number(p.updatedAt) || Date.now(),
  };
}

export function mergeIncomingNote(existing: Note | undefined, incoming: Note): Note {
  if (!existing) return incoming;
  if (incoming.updatedAt > existing.updatedAt) {
    return {
      ...incoming,
      projectId: incoming.projectId ?? existing.projectId,
      tags: incoming.tags.length ? incoming.tags : existing.tags,
      archived: incoming.archived,
      sourceAuthor: incoming.sourceAuthor ?? existing.sourceAuthor,
      sourcePublishedAt: incoming.sourcePublishedAt ?? existing.sourcePublishedAt,
    };
  }
  return {
    ...existing,
    projectId: existing.projectId ?? incoming.projectId,
    sourceAuthor: existing.sourceAuthor ?? incoming.sourceAuthor,
    sourcePublishedAt: existing.sourcePublishedAt ?? incoming.sourcePublishedAt,
  };
}

export function mergeIncomingProject(
  existing: Project | undefined,
  incoming: Project,
): Project {
  if (!existing) return incoming;
  if (incoming.updatedAt >= existing.updatedAt) {
    return { ...existing, ...incoming };
  }
  return existing;
}

export function fetchFromExtension(extensionId: string): Promise<{
  ok: boolean;
  message: string;
  notes: Note[];
  projects: Project[];
}> {
  return new Promise((resolve) => {
    const runtime = chromeRuntime();
    if (!runtime?.sendMessage) {
      resolve({
        ok: false,
        message: "Open this site in Chrome with Stay Sticky installed.",
        notes: [],
        projects: [],
      });
      return;
    }
    try {
      runtime.sendMessage(extensionId, { type: "SS_WEB_GET_NOTES" }, (response) => {
        const err = runtime.lastError;
        if (err) {
          resolve({
            ok: false,
            message: err.message || "Extension not reachable.",
            notes: [],
            projects: [],
          });
          return;
        }
        const rawNotes = Array.isArray(response?.notes) ? response.notes : [];
        const rawProjects = Array.isArray(response?.projects) ? response.projects : [];
        resolve({
          ok: Boolean(response?.ok),
          message: response?.message || "Synced.",
          notes: rawNotes.map((n: Record<string, unknown>) => normalizeExtensionNote(n)),
          projects: rawProjects.map((p: Record<string, unknown>) =>
            normalizeExtensionProject(p),
          ),
        });
      });
    } catch (e) {
      resolve({
        ok: false,
        message: e instanceof Error ? e.message : "Sync failed.",
        notes: [],
        projects: [],
      });
    }
  });
}

/** @deprecated use fetchFromExtension */
export function fetchNotesFromExtension(extensionId: string) {
  return fetchFromExtension(extensionId);
}

export function pushNotesToExtension(
  extensionId: string,
  notes: Note[],
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const runtime = chromeRuntime();
    if (!runtime?.sendMessage) {
      resolve({ ok: false, message: "Extension messaging unavailable." });
      return;
    }
    try {
      runtime.sendMessage(
        extensionId,
        { type: "SS_WEB_UPSERT_NOTES", notes },
        (response) => {
          const err = runtime.lastError;
          if (err) {
            resolve({ ok: false, message: err.message || "Push failed." });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            message: response?.message || (response?.ok ? "Pushed." : "Push failed."),
          });
        },
      );
    } catch (e) {
      resolve({ ok: false, message: e instanceof Error ? e.message : "Push failed." });
    }
  });
}

export function pushProjectsToExtension(
  extensionId: string,
  projects: Project[],
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const runtime = chromeRuntime();
    if (!runtime?.sendMessage) {
      resolve({ ok: false, message: "Extension messaging unavailable." });
      return;
    }
    try {
      runtime.sendMessage(
        extensionId,
        { type: "SS_WEB_UPSERT_PROJECTS", projects },
        (response) => {
          const err = runtime.lastError;
          if (err) {
            resolve({ ok: false, message: err.message || "Push failed." });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            message: response?.message || (response?.ok ? "Pushed." : "Push failed."),
          });
        },
      );
    } catch (e) {
      resolve({ ok: false, message: e instanceof Error ? e.message : "Push failed." });
    }
  });
}

export function deleteProjectInExtension(
  extensionId: string,
  projectId: string,
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const runtime = chromeRuntime();
    if (!runtime?.sendMessage) {
      resolve({ ok: false, message: "Extension messaging unavailable." });
      return;
    }
    try {
      runtime.sendMessage(
        extensionId,
        { type: "SS_WEB_DELETE_PROJECT", projectId },
        (response) => {
          const err = runtime.lastError;
          if (err) {
            resolve({ ok: false, message: err.message || "Delete failed." });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            message: response?.message || (response?.ok ? "Deleted." : "Delete failed."),
          });
        },
      );
    } catch (e) {
      resolve({ ok: false, message: e instanceof Error ? e.message : "Delete failed." });
    }
  });
}

export function deleteNoteInExtension(
  extensionId: string,
  noteId: string,
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const runtime = chromeRuntime();
    if (!runtime?.sendMessage) {
      resolve({ ok: false, message: "Extension messaging unavailable." });
      return;
    }
    try {
      runtime.sendMessage(
        extensionId,
        { type: "SS_WEB_DELETE_NOTE", noteId },
        (response) => {
          const err = runtime.lastError;
          if (err) {
            resolve({ ok: false, message: err.message || "Delete failed." });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            message: response?.message || (response?.ok ? "Deleted." : "Delete failed."),
          });
        },
      );
    } catch (e) {
      resolve({ ok: false, message: e instanceof Error ? e.message : "Delete failed." });
    }
  });
}
