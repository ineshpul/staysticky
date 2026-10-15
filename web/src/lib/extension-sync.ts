import { PUBLISHED_EXTENSION_ID, STORE_EXTENSION_ID } from "./extension";
import type { Note, Project } from "./types";

const EXT_ID_KEY = "ss_extension_id";
const LINKED_KEY = "ss_extension_linked";
const SKIP_AUTO_KEY = "ss_skip_auto_link";

export function getSavedExtensionId(): string {
  if (typeof window === "undefined") return PUBLISHED_EXTENSION_ID;
  return (
    localStorage.getItem(EXT_ID_KEY) ||
    PUBLISHED_EXTENSION_ID
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
    sessionStorage.setItem(SKIP_AUTO_KEY, "1");
    window.dispatchEvent(new Event("ss-extension-link-changed"));
  }
}

export function shouldAutoLinkExtension(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SKIP_AUTO_KEY) !== "1";
}

export function isExtensionLinked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LINKED_KEY) === "1" && Boolean(getSavedExtensionId());
}

function chromeRuntime() {
  return (globalThis as unknown as { chrome?: typeof chrome }).chrome?.runtime;
}

const PAGE_SOURCE = "staysticky-web";
const EXT_SOURCE = "staysticky-extension";

function parseExtensionPayload(data: {
  ok?: boolean;
  message?: string;
  notes?: unknown;
  projects?: unknown;
}): { ok: boolean; message: string; notes: Note[]; projects: Project[] } {
  const rawNotes = Array.isArray(data?.notes) ? data.notes : [];
  const rawProjects = Array.isArray(data?.projects) ? data.projects : [];
  return {
    ok: Boolean(data?.ok),
    message: data?.message || (data?.ok ? "Synced." : "Sync failed."),
    notes: rawNotes.map((n) => normalizeExtensionNote(n as Record<string, unknown>)),
    projects: rawProjects.map((p) => normalizeExtensionProject(p as Record<string, unknown>)),
  };
}

function extensionIdCandidates(preferredId?: string): string[] {
  const saved =
    typeof window !== "undefined" ? (localStorage.getItem(EXT_ID_KEY) || "").trim() : "";
  return [
    ...new Set(
      [preferredId?.trim(), STORE_EXTENSION_ID, saved, PUBLISHED_EXTENSION_ID].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
}

function requestViaPageBridge(
  message: Record<string, unknown>,
  timeoutMs = 1200,
): Promise<{ ok: boolean; message: string; notes: Note[]; projects: Project[] }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ ok: false, message: "No window.", notes: [], projects: [] });
      return;
    }
    const requestId = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMsg);
      resolve({
        ok: false,
        message: "Extension page bridge timed out.",
        notes: [],
        projects: [],
      });
    }, timeoutMs);
    function onMsg(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        requestId?: string;
        ok?: boolean;
        message?: string;
        notes?: unknown;
        projects?: unknown;
      };
      if (!data || data.source !== EXT_SOURCE || data.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      resolve(parseExtensionPayload(data));
    }
    window.addEventListener("message", onMsg);
    window.postMessage({ source: PAGE_SOURCE, requestId, ...message }, window.location.origin);
  });
}

export function subscribeToExtensionChanges(
  cb: (payload: { notes: Note[]; projects: Project[] }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  function onMsg(event: MessageEvent) {
    if (event.source !== window) return;
    const data = event.data as {
      source?: string;
      type?: string;
      notes?: unknown;
      projects?: unknown;
      ok?: boolean;
      message?: string;
    };
    if (!data || data.source !== EXT_SOURCE || data.type !== "SS_EXTENSION_CHANGED") return;
    const parsed = parseExtensionPayload({ ...data, ok: true });
    cb({ notes: parsed.notes, projects: parsed.projects });
  }
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
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
    pdfAnchor: normalizePdfAnchor(n.pdfAnchor),
  };
}

function normalizePdfAnchor(value: unknown): Note["pdfAnchor"] {
  if (!value || typeof value !== "object") return null;
  const anchor = value as Record<string, unknown>;
  const page = Number(anchor.page);
  const xRatio = Number(anchor.xRatio);
  const yRatio = Number(anchor.yRatio);
  if (!Number.isFinite(page) || page < 1) return null;
  if (!Number.isFinite(xRatio) || !Number.isFinite(yRatio)) return null;
  return { page: Math.round(page), xRatio, yRatio };
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

  // Prefer the newer note body, but never drop a project tag just because the
  // other side last edited text without one.
  if (incoming.updatedAt >= existing.updatedAt) {
    return {
      ...existing,
      ...incoming,
      projectId:
        incoming.projectId !== undefined && incoming.projectId !== null
          ? incoming.projectId
          : existing.projectId ?? incoming.projectId,
      tags: incoming.tags.length ? incoming.tags : existing.tags,
      sourceAuthor: incoming.sourceAuthor ?? existing.sourceAuthor,
      sourcePublishedAt: incoming.sourcePublishedAt ?? existing.sourcePublishedAt,
    };
  }

  return {
    ...incoming,
    ...existing,
    projectId:
      existing.projectId !== undefined && existing.projectId !== null
        ? existing.projectId
        : incoming.projectId ?? existing.projectId,
    tags: existing.tags.length ? existing.tags : incoming.tags,
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
        resolve(parseExtensionPayload(response || {}));
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

async function firstSuccessful<T extends { ok: boolean }>(
  promises: Promise<T>[],
): Promise<T | null> {
  if (!promises.length) return null;
  return new Promise((resolve) => {
    let pending = promises.length;
    let last: T | null = null;
    for (const promise of promises) {
      void promise.then((res) => {
        if (res.ok) {
          resolve(res);
          return;
        }
        last = res;
        pending -= 1;
        if (pending === 0) resolve(last);
      });
    }
  });
}

export async function pullExtensionSnapshot(preferredId?: string): Promise<{
  ok: boolean;
  message: string;
  notes: Note[];
  projects: Project[];
  extensionId: string;
}> {
  const pagePromise = requestViaPageBridge({ type: "SS_WEB_GET_NOTES" }).then((res) => ({
    ...res,
    extensionId: STORE_EXTENSION_ID,
  }));
  const runtimePromises = chromeRuntime()?.sendMessage
    ? extensionIdCandidates(preferredId).map((id) =>
        fetchFromExtension(id).then((res) => ({ ...res, extensionId: id })),
      )
    : [];
  const won = await firstSuccessful([pagePromise, ...runtimePromises]);
  if (won) return won;
  return {
    ok: false,
    message: "Could not reach the Stay Sticky extension.",
    notes: [],
    projects: [],
    extensionId: STORE_EXTENSION_ID,
  };
}

/** @deprecated use fetchFromExtension */
export function fetchNotesFromExtension(extensionId: string) {
  return fetchFromExtension(extensionId);
}

export function humanizeExtensionError(message: string): string {
  const raw = message || "";
  if (/Receiving end does not exist|Could not establish connection/i.test(raw)) {
    return "Stay Sticky isn’t reachable yet. Install it from the Chrome Web Store, then click Connect again.";
  }
  if (/Open this site in Chrome/i.test(raw)) {
    return "Open this site in Google Chrome with Stay Sticky installed.";
  }
  return raw || "Could not reach the Stay Sticky extension.";
}

export function mergeExtensionImport(
  cloudNotes: Note[],
  incomingNotes: Note[],
  incomingProjects: Project[],
): { notes: Note[]; projects: Project[] } {
  const cloudById = new Map(cloudNotes.map((n) => [n.id, n]));
  const notes = incomingNotes.map((incoming) =>
    mergeIncomingNote(cloudById.get(incoming.id), incoming),
  );
  const referenced = new Set(
    notes.map((n) => n.projectId).filter((id): id is string => Boolean(id)),
  );
  const projects = incomingProjects
    .filter((p) => referenced.has(p.id))
    .map((incoming) => mergeIncomingProject(undefined, incoming));
  return { notes, projects };
}

export async function connectToExtension(preferredId?: string): Promise<{
  ok: boolean;
  message: string;
  notes: Note[];
  projects: Project[];
  extensionId: string;
}> {
  const res = await pullExtensionSnapshot(preferredId);
  if (res.ok) saveExtensionLink(res.extensionId);
  return res;
}

async function sendExtensionCommand(
  message: Record<string, unknown>,
  extensionId?: string,
): Promise<{ ok: boolean; message: string }> {
  const page = await requestViaPageBridge(message);
  if (page.ok) return { ok: true, message: page.message };
  const ids = extensionIdCandidates(extensionId);
  const runtime = chromeRuntime();
  if (!runtime?.sendMessage) {
    return { ok: false, message: page.message || "Extension messaging unavailable." };
  }
  for (const id of ids) {
    const res = await new Promise<{ ok: boolean; message: string }>((resolve) => {
      try {
        runtime.sendMessage(id, message, (response) => {
          const err = runtime.lastError;
          if (err) {
            resolve({ ok: false, message: err.message || "Request failed." });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            message: response?.message || (response?.ok ? "Done." : "Request failed."),
          });
        });
      } catch (e) {
        resolve({ ok: false, message: e instanceof Error ? e.message : "Request failed." });
      }
    });
    if (res.ok) return res;
  }
  return { ok: false, message: page.message || "Request failed." };
}

export function pushNotesToExtension(
  extensionId: string,
  notes: Note[],
): Promise<{ ok: boolean; message: string }> {
  return sendExtensionCommand({ type: "SS_WEB_UPSERT_NOTES", notes }, extensionId);
}

export function pushProjectsToExtension(
  extensionId: string,
  projects: Project[],
): Promise<{ ok: boolean; message: string }> {
  return sendExtensionCommand({ type: "SS_WEB_UPSERT_PROJECTS", projects }, extensionId);
}

export function deleteProjectInExtension(
  extensionId: string,
  projectId: string,
): Promise<{ ok: boolean; message: string }> {
  return sendExtensionCommand({ type: "SS_WEB_DELETE_PROJECT", projectId }, extensionId);
}

export function deleteNoteInExtension(
  extensionId: string,
  noteId: string,
): Promise<{ ok: boolean; message: string }> {
  return sendExtensionCommand({ type: "SS_WEB_DELETE_NOTE", noteId }, extensionId);
}
