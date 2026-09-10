"use client";

import { useState } from "react";
import type { Note, Project } from "@/lib/types";
import {
  buildProjectExportDoc,
  downloadProjectJson,
  downloadProjectMarkdown,
  downloadProjectText,
} from "@/lib/project-export";

type Props = {
  project: Project;
  notes: Note[];
  summary: string | null;
};

export function ProjectExportMenu({ project, notes, summary }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(format: "txt" | "md" | "json" | "docx" | "pdf") {
    setError("");
    setBusy(format);
    try {
      const doc = buildProjectExportDoc(project, notes, summary);
      if (!doc.notes.length) {
        setError("Add notes to this project before exporting.");
        return;
      }
      if (format === "txt") downloadProjectText(doc);
      else if (format === "md") downloadProjectMarkdown(doc);
      else if (format === "json") downloadProjectJson(doc);
      else if (format === "docx") {
        const { downloadProjectDocx } = await import("@/lib/project-export-docx");
        await downloadProjectDocx(doc);
      } else {
        const { downloadProjectPdf } = await import("@/lib/project-export-pdf");
        downloadProjectPdf(doc);
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  const items: { id: "docx" | "pdf" | "md" | "txt" | "json"; label: string }[] = [
    { id: "docx", label: "Word (.docx)" },
    { id: "pdf", label: "PDF (.pdf)" },
    { id: "md", label: "Markdown (.md)" },
    { id: "txt", label: "Plain text (.txt)" },
    { id: "json", label: "JSON (.json)" },
  ];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn-ghost"
        disabled={Boolean(busy)}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? `Exporting ${busy}…` : "Export notes"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 180,
            background: "#fff",
            border: "1px solid rgba(31,29,26,.12)",
            borderRadius: 8,
            boxShadow: "0 10px 28px rgba(31,29,26,.12)",
            padding: 6,
            zIndex: 20,
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void run(item.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "9px 10px",
                borderRadius: 6,
                fontSize: 13.5,
                cursor: "pointer",
                color: "#1F1D1A",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(31,29,26,.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#8B3A3A" }}>{error}</p>
      )}
    </div>
  );
}
