import type { Note } from "./types";

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
}

export function clearExtensionLink() {
  localStorage.removeItem(LINKED_KEY);
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
    };
  }
  return {
    ...existing,
    // Prefer fresher text fields only when incoming is newer — already handled.
    // Keep cloud project assignment when extension note is older/missing it.
    projectId: existing.projectId ?? incoming.projectId,
  };
}

export function fetchNotesFromExtension(
  extensionId: string,
): Promise<{ ok: boolean; message: string; notes: Note[] }> {
  return new Promise((resolve) => {
    const runtime = chromeRuntime();
    if (!runtime?.sendMessage) {
      resolve({
        ok: false,
        message: "Open this site in Chrome with Stay Sticky installed.",
        notes: [],
      });
      return;
    }
    try {
      runtime.sendMessage(extensionId, { type: "SS_WEB_GET_NOTES" }, (response) => {
        const err = runtime.lastError;
        if (err) {
          resolve({ ok: false, message: err.message || "Extension not reachable.", notes: [] });
          return;
        }
        const raw = Array.isArray(response?.notes) ? response.notes : [];
        resolve({
          ok: Boolean(response?.ok),
          message: response?.message || "Synced.",
          notes: raw.map((n: Record<string, unknown>) => normalizeExtensionNote(n)),
        });
      });
    } catch (e) {
      resolve({
        ok: false,
        message: e instanceof Error ? e.message : "Sync failed.",
        notes: [],
      });
    }
  });
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
