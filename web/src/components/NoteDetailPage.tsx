"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "./AppShell";
import { useLibrary } from "@/lib/library";
import { NOTE_COLORS } from "@/lib/types";
import { formatShortDate, hostnameOf } from "@/lib/utils";

export function NoteDetailPage({ noteId }: { noteId: string }) {
  const router = useRouter();
  const { notes, projects, upsertNote } = useLibrary();
  const note = notes.find((n) => n.id === noteId);
  const project = projects.find((p) => p.id === note?.projectId);
  const related = notes
    .filter((n) => n.id !== noteId && !n.archived && n.projectId && n.projectId === note?.projectId)
    .slice(0, 4);

  if (!note) {
    return (
      <AppShell>
        <p style={{ color: "#6E6A62" }}>Note not found.</p>
        <button
          type="button"
          onClick={() => router.push("/notes")}
          style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}
        >
          ← All notes
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => router.push(project ? `/p/${project.id}` : "/notes")}
        style={{ fontSize: 13, color: "#6E6A62", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        ← {project?.name || "All notes"}
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 38,
          marginTop: 22,
          maxWidth: 1000,
        }}
      >
        <section>
          <div
            style={{
              maxWidth: 340,
              background: note.color,
              borderRadius: 2,
              boxShadow: "0 12px 30px rgba(31,29,26,.18)",
            }}
          >
            <div
              style={{
                height: 26,
                background: "rgba(0,0,0,.06)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 10px",
              }}
            >
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title="Change color"
                  onClick={() =>
                    void upsertNote({ ...note, color: c, updatedAt: Date.now() })
                  }
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 999,
                    background: c,
                    border: "1px solid rgba(0,0,0,.45)",
                    boxShadow:
                      note.color === c ? "0 0 0 1px rgba(255,255,255,.6)" : "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <p
              style={{
                margin: 0,
                padding: "18px 16px 44px",
                fontSize: 15,
                lineHeight: 1.55,
                color: "#2b2b2b",
                whiteSpace: "pre-wrap",
              }}
            >
              {note.text || "Empty note"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
            {note.tags?.map((t) => (
              <span key={t} className="tag-chip">
                {t}
              </span>
            ))}
            <span className="tag-chip dashed">+ tag</span>
          </div>

          <div className="font-mono" style={{ marginTop: 18, fontSize: 11, lineHeight: 1.7, color: "#8B867C" }}>
            <div>WRITTEN {formatShortDate(note.createdAt)}</div>
            <div>EDITED {formatShortDate(note.updatedAt)}</div>
            <div>PROJECT {project?.name || "Ungrouped"}</div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Where you wrote it</h2>
            <div style={{ flex: 1, height: 1, background: "rgba(31,29,26,.10)" }} />
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(31,29,26,.10)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div style={{ background: "#FAF9F6", borderBottom: "1px solid rgba(31,29,26,.10)", padding: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }} className="truncate">
                {note.title || "Untitled page"}
              </div>
              <div className="font-mono truncate" style={{ fontSize: 10.5, color: "#8B867C", marginTop: 4 }}>
                {note.url}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div className="font-mono" style={{ fontSize: 10.5, color: "#A29C90", letterSpacing: "0.08em", marginBottom: 8 }}>
                SURROUNDING TEXT
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#6E6A62" }}>
                {note.anchorText ? (
                  <>
                    …{" "}
                    <span style={{ background: "#FFF59D", color: "#2b2b2b", padding: "1px 3px" }}>
                      {note.anchorText}
                    </span>{" "}
                    …
                  </>
                ) : (
                  "No surrounding paragraph was saved for this note yet. Turn on snapshots in Account & sync after linking the extension."
                )}
              </p>
              <div
                className="font-mono grid place-items-center"
                style={{
                  marginTop: 14,
                  height: 120,
                  borderRadius: 2,
                  border: "1px solid rgba(31,29,26,.10)",
                  background:
                    "repeating-linear-gradient(45deg,#F2F0EA 0 8px,#EAE7DF 8px 16px)",
                  fontSize: 11,
                  color: "#8B867C",
                }}
              >
                page snapshot
              </div>
              <div className="flex flex-wrap gap-2" style={{ marginTop: 14 }}>
                <a className="btn-dark" href={note.url} target="_blank" rel="noreferrer">
                  Open the page here
                </a>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void navigator.clipboard.writeText(note.text || "")}
                >
                  Copy note
                </button>
              </div>
            </div>
          </div>

          <h3 style={{ margin: "28px 0 8px", fontSize: 15, fontWeight: 600 }}>Related notes</h3>
          {related.map((r) => (
            <Link
              key={r.id}
              href={`/n/${r.id}`}
              className="flex items-center gap-3"
              style={{
                padding: "12px 0",
                borderBottom: "1px solid rgba(31,29,26,.10)",
                fontSize: 13.5,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: r.color,
                  flexShrink: 0,
                }}
              />
              <span className="truncate flex-1">{r.text}</span>
              <span className="font-mono" style={{ fontSize: 10, color: "#A29C90" }}>
                {hostnameOf(r.url)}
              </span>
            </Link>
          ))}
          {!related.length && (
            <p style={{ color: "#8B867C", fontSize: 13.5 }}>No related notes in this project yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
