import type { Note } from "./types";
import { formatShortDate, hostnameOf } from "./utils";

/** Current handbook editions we format against. */
export const CITATION_STYLES = [
  {
    id: "apa7",
    label: "APA 7th",
    listTitle: "References",
    handbook: "Publication Manual of the APA, 7th edition",
  },
  {
    id: "mla9",
    label: "MLA 9th",
    listTitle: "Works Cited",
    handbook: "MLA Handbook, 9th edition",
  },
  {
    id: "chicago17",
    label: "Chicago 17th",
    listTitle: "Bibliography",
    handbook: "Chicago Manual of Style, 17th edition (author–date)",
  },
] as const;

export type CitationStyleId = (typeof CITATION_STYLES)[number]["id"];

export type ProjectSource = {
  key: string;
  title: string;
  url: string;
  siteName: string;
  /** Best available access/annotation date from notes on this page. */
  accessedAt: number;
  noteCount: number;
};

function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function sentenceCase(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled page";
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function stripUrlScheme(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function mlaAccessDate(ts: number): string {
  const d = new Date(ts);
  const months = [
    "Jan.",
    "Feb.",
    "Mar.",
    "Apr.",
    "May",
    "June",
    "July",
    "Aug.",
    "Sept.",
    "Oct.",
    "Nov.",
    "Dec.",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function chicagoAccessDate(ts: number): string {
  const d = new Date(ts);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function apaAccessDate(ts: number): string {
  const d = new Date(ts);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function cleanTitle(raw: string, fallbackHost: string): string {
  const t = (raw || "").trim().replace(/\s+/g, " ");
  if (!t) return fallbackHost || "Untitled page";
  // Drop common browser tab suffixes like " | Site" when short.
  return t.replace(/\s+[|\u2013\u2014-]\s+[^-|]{1,40}$/, "").trim() || t;
}

/** Unique pages cited by notes in a project, newest access first within a URL. */
export function collectProjectSources(notes: Note[]): ProjectSource[] {
  const map = new Map<string, ProjectSource>();

  for (const note of notes) {
    if (note.archived) continue;
    const url = (note.url || "").trim();
    const pageKey = (note.pageKey || "").trim();
    const key = url || pageKey;
    if (!key) continue;

    const siteName = hostnameOf(url || pageKey) || "Web";
    const title = cleanTitle(note.title || "", siteName);
    const accessedAt = note.updatedAt || note.createdAt || Date.now();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        title,
        url: url || pageKey,
        siteName,
        accessedAt,
        noteCount: 1,
      });
      continue;
    }

    existing.noteCount += 1;
    if (accessedAt > existing.accessedAt) existing.accessedAt = accessedAt;
    // Prefer a longer descriptive title when available.
    if (title.length > existing.title.length) existing.title = title;
  }

  return [...map.values()].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

export function formatSourceCitation(source: ProjectSource, style: CitationStyleId): string {
  const pageTitle = source.title;
  const site = source.siteName;
  const url = source.url.startsWith("http") ? source.url : `https://${source.url}`;

  if (style === "apa7") {
    // APA 7 webpage with unknown author/date: Title. (n.d.). Site Name. URL
    // Include retrieval date because annotated web pages often change.
    const italicTitle = sentenceCase(pageTitle);
    const sitePart =
      site.toLowerCase() === italicTitle.toLowerCase() ? "" : `${titleCase(site)}. `;
    return `${italicTitle}. (n.d.). ${sitePart}Retrieved ${apaAccessDate(source.accessedAt)}, from ${url}`;
  }

  if (style === "mla9") {
    // MLA 9: "Title of Page." Title of Website, URL. Accessed Day Month Year.
    const quoted = `"${titleCase(pageTitle)}."`;
    const container = titleCase(site);
    return `${quoted} ${container}, ${stripUrlScheme(url)}. Accessed ${mlaAccessDate(source.accessedAt)}.`;
  }

  // Chicago 17 author-date bibliography for undated web page
  return `"${titleCase(pageTitle)}." ${titleCase(site)}. Accessed ${chicagoAccessDate(source.accessedAt)}. ${url}.`;
}

export function formatInTextCitation(source: ProjectSource, style: CitationStyleId): string {
  const short =
    source.title.length > 40 ? `${source.title.slice(0, 37).trim()}…` : source.title;

  if (style === "apa7") {
    return `(${sentenceCase(short)}, n.d.)`;
  }
  if (style === "mla9") {
    return `("${titleCase(short)}")`;
  }
  return `("${titleCase(short)}" n.d.)`;
}

export type FormattedCitation = {
  source: ProjectSource;
  reference: string;
  inText: string;
};

export function buildProjectBibliography(
  notes: Note[],
  style: CitationStyleId,
): FormattedCitation[] {
  return collectProjectSources(notes).map((source) => ({
    source,
    reference: formatSourceCitation(source, style),
    inText: formatInTextCitation(source, style),
  }));
}

export function bibliographyToPlainText(
  entries: FormattedCitation[],
  style: CitationStyleId,
  projectName: string,
): string {
  const meta = CITATION_STYLES.find((s) => s.id === style)!;
  const lines = [
    `${meta.listTitle} — ${projectName}`,
    `Formatted for ${meta.handbook}`,
    `Generated ${formatShortDate(Date.now())} from Stay Sticky note sources`,
    "",
    "Note: Author names and original publication dates are not scraped from pages.",
    "Edit entries if the source lists an author or date.",
    "",
  ];

  entries.forEach((entry, i) => {
    lines.push(`${i + 1}. ${entry.reference}`);
    lines.push(`   In-text: ${entry.inText}`);
    lines.push("");
  });

  return lines.join("\n").trim() + "\n";
}
