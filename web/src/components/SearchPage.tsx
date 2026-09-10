"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { useLibrary } from "@/lib/library";
import { formatShortDate, hostnameOf, searchNotes } from "@/lib/utils";

export function SearchPage({ initialQuery = "" }: { initialQuery?: string }) {
  const { notes, projects } = useLibrary();
  const [query, setQuery] = useState(initialQuery);
  const [semantic, setSemantic] = useState(true);

  const active = notes.filter((n) => !n.archived);
  const results = useMemo(() => {
    const hits = searchNotes(active, query);
    return semantic ? hits : hits.filter((h) => h.match === "EXACT");
  }, [active, query, semantic]);

  const pages = new Set(results.map((r) => r.note.pageKey)).size;

  return (
    <AppShell>
      <div style={{ maxWidth: 760 }}>
        <div
          className="flex items-end gap-3"
          style={{ borderBottom: "2px solid #1F1D1A", paddingBottom: 12 }}
        >
          <span style={{ fontSize: 22, color: "#8B867C", paddingBottom: 6 }}>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            className="font-display"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 30,
              color: "#1F1D1A",
              minWidth: 0,
            }}
          />
          <span className="font-mono" style={{ fontSize: 11, color: "#A29C90", paddingBottom: 8 }}>
            {results.length} NOTES · {pages} PAGES
          </span>
        </div>

        <div className="flex flex-wrap gap-2" style={{ marginTop: 16, marginBottom: 8 }}>
          <button
            type="button"
            className="tag-chip"
            onClick={() => setSemantic((v) => !v)}
            style={{ cursor: "pointer" }}
          >
            Meaning-based {semantic ? "✓" : ""}
          </button>
          <span className="tag-chip">All projects</span>
          <span className="tag-chip">Any time</span>
        </div>

        <div>
          {results.map(({ note, match }) => {
            const project = projects.find((p) => p.id === note.projectId);
            return (
              <Link
                key={note.id}
                href={`/n/${note.id}`}
                className="flex gap-[18px] items-start"
                style={{
                  padding: "20px 0",
                  borderBottom: "1px solid rgba(31,29,26,.10)",
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: note.color,
                    boxShadow: "0 3px 8px rgba(31,29,26,.16)",
                    flexShrink: 0,
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span style={{ display: "block", fontSize: 15, lineHeight: 1.5 }}>
                    {note.text || "Empty note"}
                  </span>
                  <span
                    className="font-mono"
                    style={{ display: "block", marginTop: 6, fontSize: 11, color: "rgba(31,29,26,.4)" }}
                  >
                    {hostnameOf(note.url)} / {project?.name || "ungrouped"} /{" "}
                    {formatShortDate(note.updatedAt)}
                  </span>
                </span>
                <span className="font-mono" style={{ fontSize: 10, color: "#A29C90" }}>
                  {match}
                </span>
              </Link>
            );
          })}
          {query && !results.length && (
            <p style={{ marginTop: 28, color: "#6E6A62" }}>No notes matched “{query}”.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
