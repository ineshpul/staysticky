"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { NoteCard } from "./NoteCard";
import { useLibrary } from "@/lib/library";
import { withProjectCounts } from "@/lib/summary";
import { groupNotesByDate, groupNotesBySite } from "@/lib/utils";
import type { GroupBy } from "@/lib/types";

export function LibraryPage({
  mode = "all",
}: {
  mode?: "all" | "recent" | "archive";
}) {
  const { notes, projects } = useLibrary();
  const [groupBy, setGroupBy] = useState<GroupBy>("project");

  const filtered = useMemo(() => {
    if (mode === "archive") return notes.filter((n) => n.archived);
    const active = notes.filter((n) => !n.archived);
    if (mode === "recent") {
      return [...active].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40);
    }
    return active;
  }, [notes, mode]);

  const projectRows = withProjectCounts(projects, notes);
  const pages = new Set(filtered.map((n) => n.pageKey)).size;

  const title =
    mode === "archive" ? "Archive" : mode === "recent" ? "Recently visited" : "All notes";

  const empty = filtered.length === 0;

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display" style={{ margin: 0, fontSize: 38, letterSpacing: "-0.015em" }}>
          {title}
        </h1>
        {mode === "all" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono" style={{ fontSize: 11, color: "#A29C90", letterSpacing: "0.08em" }}>
              GROUP BY
            </span>
            {(["project", "site", "date"] as GroupBy[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                style={{
                  fontSize: 12.5,
                  padding: "6px 13px",
                  borderRadius: 999,
                  border: `1px solid ${groupBy === g ? "#1F1D1A" : "rgba(31,29,26,.16)"}`,
                  background: groupBy === g ? "#1F1D1A" : "transparent",
                  color: groupBy === g ? "#F7F5F0" : "#4A463F",
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      <p style={{ margin: "10px 0 34px", fontSize: 14.5, color: "#6E6A62" }}>
        {filtered.length} notes across {pages} pages
        {mode === "all" ? `. Auto-grouped into ${projectRows.length} projects.` : "."}
      </p>

      {empty ? (
        <EmptyNotes />
      ) : mode === "recent" || mode === "archive" ? (
        <div className="note-grid">
          {filtered.map((note, i) => (
            <NoteCard key={note.id} note={note} index={i} />
          ))}
        </div>
      ) : groupBy === "project" ? (
        <div className="flex flex-col" style={{ gap: 44 }}>
          {projectRows.map((project) => {
            const groupNotes = filtered.filter((n) => n.projectId === project.id);
            if (!groupNotes.length) return null;
            return (
              <section key={project.id}>
                <div
                  className="flex flex-wrap items-center gap-3"
                  style={{
                    paddingBottom: 12,
                    marginBottom: 22,
                    borderBottom: "1px solid rgba(31,29,26,.10)",
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: project.color,
                      border: "1px solid rgba(31,29,26,.2)",
                    }}
                  />
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{project.name}</h2>
                  <span className="font-mono" style={{ fontSize: 11, color: "#A29C90" }}>
                    {project.noteCount} notes / {project.sourceCount} sources
                  </span>
                  <Link
                    href={`/p/${project.id}`}
                    style={{ marginLeft: "auto", fontSize: 13, textDecoration: "underline", color: "#4A463F" }}
                  >
                    Open workspace
                  </Link>
                </div>
                <div className="note-grid">
                  {groupNotes.map((note, i) => (
                    <NoteCard key={note.id} note={note} index={i} />
                  ))}
                </div>
              </section>
            );
          })}
          {filtered.some((n) => !n.projectId) && (
            <section>
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Ungrouped</h2>
              <div className="note-grid" style={{ marginTop: 22 }}>
                {filtered
                  .filter((n) => !n.projectId)
                  .map((note, i) => (
                    <NoteCard key={note.id} note={note} index={i} />
                  ))}
              </div>
            </section>
          )}
        </div>
      ) : groupBy === "site" ? (
        <div className="flex flex-col" style={{ gap: 44 }}>
          {groupNotesBySite(filtered).map(([site, siteNotes]) => (
            <section key={site}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 22 }}>{site}</h2>
              <div className="note-grid">
                {siteNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 44 }}>
          {groupNotesByDate(filtered).map(([date, dateNotes]) => (
            <section key={date}>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 22 }}>{date}</h2>
              <div className="note-grid">
                {dateNotes.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function EmptyNotes() {
  return (
    <div style={{ maxWidth: 520, margin: "9vh auto 0", textAlign: "center" }}>
      <div style={{ position: "relative", height: 140, marginBottom: 24 }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 10,
            width: 150,
            height: 110,
            marginLeft: -90,
            background: "#FFF59D",
            borderRadius: 2,
            transform: "rotate(-5deg)",
            boxShadow: "0 8px 18px rgba(31,29,26,.12)",
          }}
        />
        <div
          className="font-mono grid place-items-center"
          style={{
            position: "absolute",
            left: "50%",
            top: 24,
            width: 150,
            height: 110,
            marginLeft: -40,
            background: "#FBFAF7",
            borderRadius: 2,
            border: "1px dashed rgba(31,29,26,.25)",
            transform: "rotate(4deg)",
            fontSize: 11,
            color: "#8B867C",
          }}
        >
          nothing yet
        </div>
      </div>
      <h1 className="font-display" style={{ fontSize: 32, margin: "0 0 12px" }}>
        No notes here yet
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#6E6A62", margin: "0 0 22px" }}>
        Open any page, click the Stay Sticky icon, and drop a note where your thought happened.
        It shows up here the moment you sync.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <a className="btn-dark" href="https://github.com/ineshpul/staysticky" target="_blank" rel="noreferrer">
          Pin the extension
        </a>
        <Link href="/notes" className="btn-ghost">
          See an example library
        </Link>
      </div>
    </div>
  );
}
