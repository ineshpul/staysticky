import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  BorderStyle,
} from "docx";
import type { ProjectExportDoc } from "./project-export";
import { downloadBlob, projectExportBasename } from "./project-export";
import { formatShortDate, hostnameOf } from "./utils";

function parasFromText(text: string, opts?: { italics?: boolean; color?: string }) {
  const chunks = (text || "").split(/\n+/).filter(Boolean);
  if (!chunks.length) {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: "(empty note)",
            italics: true,
            color: "6E6A62",
          }),
        ],
        spacing: { after: 120 },
      }),
    ];
  }
  return chunks.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            italics: opts?.italics,
            color: opts?.color,
          }),
        ],
        spacing: { after: 80 },
      }),
  );
}

export async function downloadProjectDocx(doc: ProjectExportDoc): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      text: doc.project.name,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported ${formatShortDate(doc.exportedAt)} · ${doc.notes.length} notes`,
          italics: true,
          size: 20,
          color: "6E6A62",
        }),
      ],
      spacing: { after: 280 },
    }),
  ];

  if (doc.summary?.trim()) {
    children.push(
      new Paragraph({
        text: "Summary",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 120 },
      }),
      ...parasFromText(doc.summary.trim()),
    );
  }

  children.push(
    new Paragraph({
      text: "Notes",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 280, after: 160 },
    }),
  );

  doc.notes.forEach((note, i) => {
    const title = note.title?.trim() || hostnameOf(note.url || note.pageKey) || `Note ${i + 1}`;
    children.push(
      new Paragraph({
        text: `${i + 1}. ${title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      }),
    );

    if (note.url) {
      children.push(
        new Paragraph({
          children: [
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: note.url,
                  style: "Hyperlink",
                  size: 18,
                }),
              ],
              link: note.url,
            }),
          ],
          spacing: { after: 60 },
        }),
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Written ${formatShortDate(note.createdAt)}`,
            size: 18,
            color: "8B867C",
          }),
        ],
        spacing: { after: 120 },
      }),
      ...parasFromText(note.text || ""),
    );

    if (note.anchorText?.trim()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Context",
              bold: true,
              size: 18,
              color: "6E6A62",
            }),
          ],
          spacing: { before: 80, after: 40 },
        }),
        ...parasFromText(note.anchorText.trim(), { italics: true, color: "4A463F" }),
      );
    }

    children.push(
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "E6E3DB", space: 8 },
        },
        spacing: { after: 120 },
      }),
    );
  });

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${projectExportBasename(doc)}.docx`);
}
