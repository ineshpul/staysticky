import { jsPDF } from "jspdf";
import type { ProjectExportDoc } from "./project-export";
import { projectExportBasename } from "./project-export";
import { formatShortDate, hostnameOf } from "./utils";

function wrapLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "", maxWidth) as string[];
}

export function downloadProjectPdf(doc: ProjectExportDoc): void {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 56;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeLines = (
    text: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    const style = opts.style ?? "normal";
    const color = opts.color ?? ([31, 29, 26] as [number, number, number]);
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(color[0], color[1], color[2]);
    const lines = wrapLines(pdf, text, maxWidth);
    const lineHeight = size + 4;
    for (const line of lines) {
      ensureSpace(lineHeight);
      pdf.text(line, margin, y);
      y += lineHeight;
    }
    y += opts.gap ?? 6;
  };

  writeLines(doc.project.name, { size: 22, style: "bold", gap: 8 });
  writeLines(`Exported ${formatShortDate(doc.exportedAt)} · ${doc.notes.length} notes`, {
    size: 10,
    style: "italic",
    color: [110, 106, 98],
    gap: 18,
  });

  if (doc.summary?.trim()) {
    writeLines("Summary", { size: 14, style: "bold", gap: 8 });
    writeLines(doc.summary.trim(), { size: 11, gap: 16 });
  }

  writeLines("Notes", { size: 14, style: "bold", gap: 12 });

  doc.notes.forEach((note, i) => {
    const title = note.title?.trim() || hostnameOf(note.url || note.pageKey) || `Note ${i + 1}`;
    writeLines(`${i + 1}. ${title}`, { size: 12, style: "bold", gap: 4 });
    if (note.url) {
      writeLines(note.url, { size: 9, color: [74, 70, 63], gap: 2 });
    }
    writeLines(`Written ${formatShortDate(note.createdAt)}`, {
      size: 9,
      color: [139, 134, 124],
      gap: 6,
    });
    writeLines(note.text?.trim() || "(empty note)", {
      size: 11,
      style: note.text?.trim() ? "normal" : "italic",
      gap: 8,
    });
    if (note.anchorText?.trim()) {
      writeLines(`Context: ${note.anchorText.trim()}`, {
        size: 10,
        style: "italic",
        color: [74, 70, 63],
        gap: 14,
      });
    } else {
      y += 6;
    }
  });

  pdf.save(`${projectExportBasename(doc)}.pdf`);
}
