import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from "docx";
import {
  CITATION_STYLES,
  formatSourceCitationSpans,
  type CitationSpan,
  type CitationStyleId,
  type FormattedCitation,
} from "./citations";
import { downloadBlob, slugifyProjectName } from "./project-export";
import { formatShortDate } from "./utils";

const FONT = "Times New Roman";
const SIZE = 24;
const HANGING = convertInchesToTwip(0.5);

function run(text: string, extra?: { italics?: boolean; bold?: boolean; size?: number }) {
  return new TextRun({
    text,
    font: FONT,
    size: extra?.size ?? SIZE,
    italics: extra?.italics,
    bold: extra?.bold,
  });
}

function referenceChildren(spans: CitationSpan[]) {
  return spans
    .filter((part) => part.text)
    .map((part) => {
      if (!part.href) return run(part.text, { italics: part.italics });
      return new ExternalHyperlink({
        link: part.href,
        children: [
          new TextRun({
            text: part.text,
            font: FONT,
            size: SIZE,
            italics: part.italics,
            style: "Hyperlink",
          }),
        ],
      });
    });
}

function referenceParagraph(spans: CitationSpan[]) {
  return new Paragraph({
    indent: { left: HANGING, hanging: HANGING },
    spacing: { line: 480, lineRule: LineRuleType.AUTO },
    children: referenceChildren(spans),
  });
}

/** Bibliography formatted for Word: hanging indent, double spacing, italic titles. */
export async function bibliographyToDocxBlob(
  entries: FormattedCitation[],
  style: CitationStyleId,
  projectName: string,
): Promise<Blob> {
  const meta = CITATION_STYLES.find((s) => s.id === style)!;
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 480, lineRule: LineRuleType.AUTO },
      children: [run(meta.listTitle, { bold: style === "apa7" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360, line: 480, lineRule: LineRuleType.AUTO },
      children: [
        run(`${projectName} · ${formatShortDate(Date.now())}`, {
          italics: true,
          size: 20,
        }),
      ],
    }),
    ...entries.map((entry) =>
      referenceParagraph(formatSourceCitationSpans(entry.source, style)),
    ),
    new Paragraph({
      children: [new PageBreak()],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240, line: 480, lineRule: LineRuleType.AUTO },
      children: [run("In-text citations", { bold: style === "apa7" })],
    }),
    ...entries.map(
      (entry) =>
        new Paragraph({
          spacing: { line: 480, lineRule: LineRuleType.AUTO },
          children: [run(`${entry.inText}  ${entry.source.title}`)],
        }),
    ),
  ];

  const document = new Document({
    title: `${meta.listTitle} — ${projectName}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}

export async function downloadBibliographyDocx(
  entries: FormattedCitation[],
  style: CitationStyleId,
  projectName: string,
): Promise<void> {
  const blob = await bibliographyToDocxBlob(entries, style, projectName);
  downloadBlob(
    blob,
    `stay-sticky-${slugifyProjectName(projectName)}-${style}-citations.docx`,
  );
}
