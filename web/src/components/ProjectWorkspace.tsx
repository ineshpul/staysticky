"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { NoteCard } from "./NoteCard";
import { useLibrary } from "@/lib/library";
import { buildExtractiveSummary, projectStats } from "@/lib/summary";
import { hostnameOf } from "@/lib/utils";

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { projects, notes, refreshProjectSummary, assignNoteToProject } = useLibrary();
  const [pickerOpen, setPickerOpen] = useState(false);
  const project = projects.find((p) => p.id === projectId);
  const { notes: projectNotes, noteCount, sourceCount } = useMemo(
    () => projectStats(notes, projectId),
    [notes, projectId],
  );

  const addableNotes = useMemo(
    () =>
      notes.filter(
        (n) => !n.archived && n.projectId !== projectId,
      ),
    [notes, projectId],
  );

  const draft = useMemo(
    () => buildExtractiveSummary(projectNotes, project?.name || "Project"),
    [projectNotes, project?.name],
  );

  useEffect(() => {
    if (project && !project.summary && projectNotes.length) {
      void refreshProjectSummary(projectId);
    }
  }, [project, projectNotes.length, projectId, refreshProjectSummary]);

  if (!project) {
    return (
      <AppShell>
        <p style={{ color: "#6E6A62" }}>Project not found.</p>
        <button
          type="button"
          onClick={() => router.push("/notes")}
          style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: "#4A463F" }}
        >
          ← All notes
        </button>
      </AppShell>
    );
  }

  const summaryText = project.summary || [draft.lede, ...draft.paragraphs].join("\n\n");
  const [lede, ...rest] = summaryText.split(/\n\n+/);
  const tags = Array.from(new Set([...(project.tags || []), ...draft.tags]));

  return (
    <AppShell>
      <button
        type="button"
        onClick={() => router.push("/notes")}
        style={{ fontSize: 13, color: "#6E6A62", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        ← All notes
      </button>
      <div className="flex flex-wrap items-baseline gap-3" style={{ marginTop: 14 }}>
        <h1 className="font-display" style={{ margin: 0, fontSize: 38, letterSpacing: "-0.015em" }}>
          {project.name}
        </h1>
        <span className="font-mono" style={{ fontSize: 11, color: "#A29C90", letterSpacing: "0.08em" }}>
          {noteCount} NOTES · {sourceCount} SOURCES
        </span>
      </div>
      <p style={{ margin: "10px 0 34px", fontSize: 14.5, color: "#6E6A62", maxWidth: "60ch" }}>
        Notes gathered from pages you annotated while reading. Summary below is a free extractive
        draft from your note text — not a paid AI model.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 34,
          alignItems: "start",
        }}
      >
        <section>
          <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Notes</h2>
            <div style={{ flex: 1, height: 1, background: "rgba(31,29,26,.10)" }} />
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "6px 10px", fontSize: 12.5 }}
              onClick={() => setPickerOpen((v) => !v)}
            >
              {pickerOpen ? "Done" : "Add notes"}
            </button>
          </div>

          {pickerOpen && (
            <div
              style={{
                background: "#FBFAF7",
                border: "1px solid rgba(31,29,26,.10)",
                borderRadius: 4,
                padding: 14,
                marginBottom: 18,
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6E6A62" }}>
                Choose notes to move into this project.
              </p>
              {addableNotes.length ? (
                <div className="flex flex-col gap-1">
                  {addableNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void assignNoteToProject(n.id, projectId)}
                      className="flex w-full items-center gap-3 text-left"
                      style={{
                        padding: "10px 8px",
                        borderRadius: 8,
                        border: "none",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 13.5,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: n.color,
                          flexShrink: 0,
                        }}
                      />
                      <span className="truncate flex-1">{n.text || "Empty note"}</span>
                      <span className="font-mono" style={{ fontSize: 10, color: "#A29C90" }}>
                        {hostnameOf(n.url)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#8B867C" }}>
                  Every note is already in this project.
                </p>
              )}
            </div>
          )}

          <div className="note-grid-compact">
            {projectNotes.map((note, i) => (
              <NoteCard key={note.id} note={note} index={i} showDate={false} />
            ))}
          </div>
          {!projectNotes.length && !pickerOpen && (
            <p style={{ color: "#8B867C", fontSize: 14 }}>
              No notes here yet. Use Add notes, or open a note and pick this project.
            </p>
          )}
        </section>

        <aside
          style={{
            background: "#fff",
            border: "1px solid rgba(31,29,26,.10)",
            borderRadius: 4,
            padding: 24,
            position: "sticky",
            top: 28,
          }}
        >
          <div className="flex justify-between gap-3" style={{ marginBottom: 14 }}>
            <span className="font-mono" style={{ fontSize: 11, color: "#A29C90", letterSpacing: "0.08em" }}>
              DRAFT SUMMARY
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: "#A29C90" }}>
              from {noteCount} notes
            </span>
          </div>
          <p className="font-display" style={{ margin: "0 0 14px", fontSize: 21, lineHeight: 1.35 }}>
            {lede}
          </p>
          {rest.map((p) => (
            <p key={p.slice(0, 24)} style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.6, color: "#3E3A34" }}>
              {p}
            </p>
          ))}
          <div className="flex flex-wrap gap-2" style={{ margin: "18px 0" }}>
            {tags.map((t) => (
              <span key={t} className="tag-chip">
                {t}
              </span>
            ))}
            <span className="tag-chip dashed">+ tag</span>
          </div>
          <div style={{ height: 1, background: "rgba(31,29,26,.10)", margin: "18px 0" }} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-dark"
              onClick={() => void refreshProjectSummary(projectId)}
            >
              Refresh draft
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const blob = new Blob([summaryText], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-summary.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
