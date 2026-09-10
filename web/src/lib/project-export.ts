import type { Note, Project } from "./types";
import { formatShortDate, hostnameOf } from "./utils";

export type ProjectExportDoc = {
  project: Project;
  notes: Note[];
  summary: string | null;
  exportedAt: number;
};

export function slugifyProjectName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "project"
  );
}

export function buildProjectExportDoc(
  project: Project,
  notes: Note[],
  summary?: string | null,
): ProjectExportDoc {
  const projectNotes = notes
    .filter((n) => n.projectId === project.id && !n.archived)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return {
    project,
    notes: projectNotes,
    summary: summary ?? project.summary,
    exportedAt: Date.now(),
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function projectExportBasename(doc: ProjectExportDoc): string {
  return `stay-sticky-${slugifyProjectName(doc.project.name)}`;
}

function noteHeading(note: Note, index: number): string {
  const host = hostnameOf(note.url || note.pageKey);
  const title = note.title?.trim() || host || `Note ${index + 1}`;
  return title;
}

/** Plain-text dump of every note in the project. */
export function projectExportToText(doc: ProjectExportDoc): string {
  const lines: string[] = [
    doc.project.name,
    "=".repeat(Math.min(60, Math.max(12, doc.project.name.length))),
    `Exported ${formatShortDate(doc.exportedAt)} · ${doc.notes.length} notes`,
    "",
  ];

  if (doc.summary?.trim()) {
    lines.push("Summary", "-------", doc.summary.trim(), "");
  }

  doc.notes.forEach((note, i) => {
    lines.push(`${i + 1}. ${noteHeading(note, i)}`);
    if (note.url) lines.push(note.url);
    lines.push(`Written ${formatShortDate(note.createdAt)}`);
    lines.push("");
    lines.push((note.text || "(empty note)").trim());
    if (note.anchorText?.trim()) {
      lines.push("");
      lines.push(`Context: ${note.anchorText.trim()}`);
    }
    lines.push("");
    lines.push("-".repeat(40));
    lines.push("");
  });

  return lines.join("\n").trim() + "\n";
}

/** Markdown dump suitable for Notion, Obsidian, GitHub, etc. */
export function projectExportToMarkdown(doc: ProjectExportDoc): string {
  const lines: string[] = [
    `# ${doc.project.name}`,
    "",
    `*Exported ${formatShortDate(doc.exportedAt)} · ${doc.notes.length} notes*`,
    "",
  ];

  if (doc.summary?.trim()) {
    lines.push("## Summary", "", doc.summary.trim(), "");
  }

  lines.push("## Notes", "");

  doc.notes.forEach((note, i) => {
    lines.push(`### ${i + 1}. ${noteHeading(note, i)}`);
    lines.push("");
    if (note.url) lines.push(`[${hostnameOf(note.url) || "Source"}](${note.url})`);
    lines.push(`Written ${formatShortDate(note.createdAt)}`);
    lines.push("");
    lines.push((note.text || "*(empty note)*").trim());
    lines.push("");
    if (note.anchorText?.trim()) {
      lines.push("> " + note.anchorText.trim().replace(/\n/g, "\n> "));
      lines.push("");
    }
  });

  return lines.join("\n").trim() + "\n";
}

export function projectExportToJson(doc: ProjectExportDoc): string {
  return JSON.stringify(
    {
      project: {
        id: doc.project.id,
        name: doc.project.name,
        color: doc.project.color,
        tags: doc.project.tags,
        summary: doc.summary,
      },
      exportedAt: doc.exportedAt,
      notes: doc.notes.map((n) => ({
        id: n.id,
        title: n.title,
        url: n.url,
        text: n.text,
        color: n.color,
        tags: n.tags,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        anchorText: n.anchorText,
      })),
    },
    null,
    2,
  );
}

export function downloadProjectText(doc: ProjectExportDoc) {
  downloadBlob(
    new Blob([projectExportToText(doc)], { type: "text/plain;charset=utf-8" }),
    `${projectExportBasename(doc)}.txt`,
  );
}

export function downloadProjectMarkdown(doc: ProjectExportDoc) {
  downloadBlob(
    new Blob([projectExportToMarkdown(doc)], { type: "text/markdown;charset=utf-8" }),
    `${projectExportBasename(doc)}.md`,
  );
}

export function downloadProjectJson(doc: ProjectExportDoc) {
  downloadBlob(
    new Blob([projectExportToJson(doc)], { type: "application/json;charset=utf-8" }),
    `${projectExportBasename(doc)}.json`,
  );
}
