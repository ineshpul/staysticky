import type { Note } from "./types";

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function groupNotesBySite(notes: Note[]) {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const key = hostnameOf(n.url || n.pageKey);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}

export function groupNotesByDate(notes: Note[]) {
  const map = new Map<string, Note[]>();
  for (const n of notes) {
    const key = new Date(n.updatedAt).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return [...map.entries()];
}

export function searchNotes(notes: Note[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return notes
    .map((note) => {
      const hay = `${note.text} ${note.title} ${note.url} ${note.tags.join(" ")}`.toLowerCase();
      const exact = terms.every((t) => hay.includes(t));
      const related =
        !exact &&
        terms.some((t) =>
          hay.split(/[^a-z0-9]+/).some((w) => w.startsWith(t.slice(0, 4)) && t.length >= 4),
        );
      if (!exact && !related) return null;
      return { note, match: exact ? ("EXACT" as const) : ("RELATED" as const) };
    })
    .filter(Boolean) as { note: Note; match: "EXACT" | "RELATED" }[];
}

/** Ask the installed extension to push local notes (requires extension ID). */
export function requestExtensionSync(extensionId: string): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const chromeApi = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
    if (!chromeApi?.runtime?.sendMessage) {
      resolve({ ok: false, message: "Open this site in Chrome with the Stay Sticky extension installed." });
      return;
    }
    try {
      chromeApi.runtime.sendMessage(
        extensionId,
        { type: "SS_WEB_REQUEST_SYNC" },
        (response) => {
          const err = chromeApi.runtime.lastError;
          if (err) {
            resolve({ ok: false, message: err.message || "Extension not reachable." });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            message: response?.message || (response?.ok ? "Sync requested." : "Sync failed."),
          });
        },
      );
    } catch (e) {
      resolve({ ok: false, message: e instanceof Error ? e.message : "Sync failed." });
    }
  });
}
