"use client";

import { useMemo, useState } from "react";
import type { Note } from "@/lib/types";
import {
  CITATION_STYLES,
  bibliographyToPlainText,
  buildProjectBibliography,
  type CitationStyleId,
} from "@/lib/citations";
import { downloadBlob, slugifyProjectName } from "@/lib/project-export";

type Props = {
  projectName: string;
  notes: Note[];
};

export function ProjectCitationsPanel({ projectName, notes }: Props) {
  const [style, setStyle] = useState<CitationStyleId>("apa7");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const meta = CITATION_STYLES.find((s) => s.id === style)!;
  const entries = useMemo(
    () => buildProjectBibliography(notes, style),
    [notes, style],
  );

  async function copyText(text: string, key: string) {
    setError("");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("Could not copy — your browser blocked clipboard access.");
    }
  }

  function downloadList() {
    const body = bibliographyToPlainText(entries, style, projectName);
    downloadBlob(
      new Blob([body], { type: "text/plain;charset=utf-8" }),
      `stay-sticky-${slugifyProjectName(projectName)}-${style}-citations.txt`,
    );
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid rgba(31,29,26,.10)",
        borderRadius: 4,
        padding: 24,
        marginTop: 34,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3" style={{ marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{meta.listTitle}</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6E6A62", maxWidth: "62ch" }}>
            Cite every unique page tagged in this project. Styles follow{" "}
            <strong style={{ fontWeight: 600, color: "#4A463F" }}>{meta.handbook}</strong>. Titles
            and URLs come from your notes; add author/date by hand if the page lists them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={!entries.length}
            onClick={() =>
              void copyText(
                entries.map((e) => e.reference).join("\n\n"),
                "all",
              )
            }
          >
            {copied === "all" ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            className="btn-dark"
            disabled={!entries.length}
            onClick={downloadList}
          >
            Download .txt
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" style={{ margin: "16px 0 18px" }} role="tablist" aria-label="Citation style">
        {CITATION_STYLES.map((s) => {
          const active = s.id === style;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStyle(s.id)}
              style={{
                border: "1px solid rgba(31,29,26,.14)",
                background: active ? "#1F1D1A" : "#FBFAF7",
                color: active ? "#FBFAF7" : "#1F1D1A",
                borderRadius: 999,
                padding: "7px 12px",
                fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {!entries.length ? (
        <p style={{ margin: 0, fontSize: 14, color: "#8B867C" }}>
          Tag notes with page URLs into this project to generate citations.
        </p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
          {entries.map((entry) => (
            <li
              key={entry.source.key}
              style={{
                border: "1px solid rgba(31,29,26,.10)",
                borderRadius: 4,
                padding: "14px 14px 12px",
                background: "#FBFAF7",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "#1F1D1A",
                  textIndent: style === "apa7" || style === "chicago17" ? "-1.5em" : 0,
                  paddingLeft: style === "apa7" || style === "chicago17" ? "1.5em" : 0,
                }}
              >
                {entry.reference}
              </p>
              <div
                className="flex flex-wrap items-center gap-2"
                style={{ marginTop: 10, fontSize: 12, color: "#8B867C" }}
              >
                <span className="font-mono">In-text {entry.inText}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {entry.source.noteCount} note{entry.source.noteCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}
                  onClick={() => void copyText(entry.reference, entry.source.key)}
                >
                  {copied === entry.source.key ? "Copied" : "Copy"}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#8B3A3A" }}>{error}</p>
      )}
    </section>
  );
}
