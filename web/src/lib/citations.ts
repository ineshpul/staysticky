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
  author: string | null;
  /** YYYY-MM-DD when known. */
  publishedAt: string | null;
  noteIds: string[];
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

/** Normalize user/meta dates to YYYY or YYYY-MM-DD when possible. */
export function normalizePublishedDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  // If the raw string was only a year word-wise, keep year — otherwise full date.
  if (/^\d{4}\D*$/.test(trimmed) && !/\d{1,2}/.test(trimmed.slice(4))) return String(y);
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string): { year: number; month: number; day: number; yearOnly: boolean } | null {
  if (/^\d{4}$/.test(ymd)) {
    return { year: Number(ymd), month: 1, day: 1, yearOnly: true };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), yearOnly: false };
}

const APA_MONTHS = [
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

const MLA_MONTHS = [
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

function mlaAccessDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MLA_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function chicagoAccessDate(ts: number): string {
  const d = new Date(ts);
  return `${APA_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function apaAccessDate(ts: number): string {
  return chicagoAccessDate(ts);
}

function formatApaDate(publishedAt: string | null): string {
  if (!publishedAt) return "n.d.";
  const parts = parseYmd(publishedAt);
  if (!parts) return "n.d.";
  if (parts.yearOnly) return String(parts.year);
  return `${parts.year}, ${APA_MONTHS[parts.month - 1]} ${parts.day}`;
}

function formatMlaDate(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const parts = parseYmd(publishedAt);
  if (!parts) return null;
  if (parts.yearOnly) return String(parts.year);
  return `${parts.day} ${MLA_MONTHS[parts.month - 1]} ${parts.year}`;
}

function formatChicagoDate(publishedAt: string | null): string | null {
  if (!publishedAt) return null;
  const parts = parseYmd(publishedAt);
  if (!parts) return null;
  if (parts.yearOnly) return String(parts.year);
  return `${APA_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

/** "Jane Smith" → "Smith, J." ; "Smith, J." stays; orgs pass through. */
export function formatApaAuthor(author: string): string {
  const raw = author.trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (raw.includes(",")) return raw.endsWith(".") ? raw : `${raw}.`;
  // Likely organization if many caps words / Inc / University
  if (
    /\b(Inc|LLC|Ltd|University|Institute|Organization|Association|Agency|Department)\b/i.test(
      raw,
    ) ||
    raw.split(" ").length > 3
  ) {
    return raw.endsWith(".") ? raw : `${raw}.`;
  }
  const bits = raw.split(" ");
  if (bits.length === 1) return raw.endsWith(".") ? raw : `${raw}.`;
  const last = bits[bits.length - 1];
  const initials = bits
    .slice(0, -1)
    .map((b) => `${b.charAt(0).toUpperCase()}.`)
    .join(" ");
  return `${last}, ${initials}`;
}

export function formatMlaAuthor(author: string): string {
  const raw = author.trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (raw.includes(",")) return raw.endsWith(".") ? raw : `${raw}.`;
  const bits = raw.split(" ");
  if (bits.length === 1) return `${raw}.`;
  if (
    /\b(Inc|LLC|Ltd|University|Institute|Organization|Association|Agency|Department)\b/i.test(
      raw,
    )
  ) {
    return `${raw}.`;
  }
  const last = bits[bits.length - 1];
  const first = bits.slice(0, -1).join(" ");
  return `${last}, ${first}.`;
}

function chicagoAuthor(author: string): string {
  return formatMlaAuthor(author).replace(/\.$/, "");
}

function inTextAuthorLabel(author: string | null, title: string): string {
  if (author?.trim()) {
    const raw = author.trim();
    if (raw.includes(",")) return raw.split(",")[0].trim();
    const bits = raw.split(/\s+/);
    if (
      /\b(Inc|LLC|Ltd|University|Institute|Organization|Association)\b/i.test(raw) ||
      bits.length > 3
    ) {
      return raw;
    }
    return bits[bits.length - 1];
  }
  const short = title.length > 40 ? `${title.slice(0, 37).trim()}…` : title;
  return short;
}

function cleanTitle(raw: string, fallbackHost: string): string {
  const t = (raw || "").trim().replace(/\s+/g, " ");
  if (!t) return fallbackHost || "Untitled page";
  return t.replace(/\s+[|\u2013\u2014-]\s+[^-|]{1,40}$/, "").trim() || t;
}

function sourceKeyForNote(note: Note): string | null {
  const url = (note.url || "").trim();
  const pageKey = (note.pageKey || "").trim();
  return url || pageKey || null;
}

/** Unique pages cited by notes in a project. */
export function collectProjectSources(notes: Note[]): ProjectSource[] {
  const map = new Map<string, ProjectSource>();

  for (const note of notes) {
    if (note.archived) continue;
    const key = sourceKeyForNote(note);
    if (!key) continue;

    const siteName = hostnameOf(note.url || note.pageKey) || "Web";
    const title = cleanTitle(note.title || "", siteName);
    const accessedAt = note.updatedAt || note.createdAt || Date.now();
    const author = note.sourceAuthor?.trim() || null;
    const publishedAt = normalizePublishedDate(note.sourcePublishedAt);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        title,
        url: (note.url || note.pageKey || "").trim(),
        siteName,
        accessedAt,
        noteCount: 1,
        author,
        publishedAt,
        noteIds: [note.id],
      });
      continue;
    }

    existing.noteCount += 1;
    existing.noteIds.push(note.id);
    if (accessedAt > existing.accessedAt) existing.accessedAt = accessedAt;
    if (title.length > existing.title.length) existing.title = title;
    if (!existing.author && author) existing.author = author;
    if (!existing.publishedAt && publishedAt) existing.publishedAt = publishedAt;
  }

  return [...map.values()].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

export function formatSourceCitation(source: ProjectSource, style: CitationStyleId): string {
  const pageTitle = source.title;
  const site = source.siteName;
  const url = source.url.startsWith("http") ? source.url : `https://${source.url}`;
  const author = source.author?.trim() || null;
  const publishedAt = source.publishedAt;

  if (style === "apa7") {
    const italicTitle = sentenceCase(pageTitle);
    const sitePart =
      site.toLowerCase() === italicTitle.toLowerCase() ||
      (author && author.toLowerCase() === site.toLowerCase())
        ? ""
        : `${titleCase(site)}. `;
    const date = formatApaDate(publishedAt);
    if (author) {
      return `${formatApaAuthor(author)} (${date}). ${italicTitle}. ${sitePart}${url}`;
    }
    return `${italicTitle}. (${date}). ${sitePart}Retrieved ${apaAccessDate(source.accessedAt)}, from ${url}`;
  }

  if (style === "mla9") {
    const quoted = `"${titleCase(pageTitle)}."`;
    const container = titleCase(site);
    const pub = formatMlaDate(publishedAt);
    const access = `Accessed ${mlaAccessDate(source.accessedAt)}.`;
    const mid = pub
      ? `${quoted} ${container}, ${pub}, ${stripUrlScheme(url)}.`
      : `${quoted} ${container}, ${stripUrlScheme(url)}. ${access}`;
    if (author) return `${formatMlaAuthor(author)} ${mid}`;
    return mid;
  }

  // Chicago 17 author-date
  const pub = formatChicagoDate(publishedAt);
  if (author) {
    const who = chicagoAuthor(author);
    if (pub) {
      return `${who}. ${pub}. "${titleCase(pageTitle)}." ${titleCase(site)}. ${url}.`;
    }
    return `${who}. n.d. "${titleCase(pageTitle)}." ${titleCase(site)}. Accessed ${chicagoAccessDate(source.accessedAt)}. ${url}.`;
  }
  if (pub) {
    return `"${titleCase(pageTitle)}." ${titleCase(site)}. ${pub}. ${url}.`;
  }
  return `"${titleCase(pageTitle)}." ${titleCase(site)}. Accessed ${chicagoAccessDate(source.accessedAt)}. ${url}.`;
}

export function formatInTextCitation(source: ProjectSource, style: CitationStyleId): string {
  const label = inTextAuthorLabel(source.author, source.title);
  const year = source.publishedAt ? source.publishedAt.slice(0, 4) : "n.d.";

  if (style === "apa7") {
    if (source.author) return `(${label}, ${year})`;
    return `(${sentenceCase(label)}, ${year})`;
  }
  if (style === "mla9") {
    if (source.author) return `(${label})`;
    return `("${titleCase(label)}")`;
  }
  if (source.author) return `(${label} ${year})`;
  return `("${titleCase(label)}" ${year})`;
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
    "Author and publication date come from page metadata when available, or from edits you make in the library.",
    "",
  ];

  entries.forEach((entry, i) => {
    lines.push(`${i + 1}. ${entry.reference}`);
    lines.push(`   In-text: ${entry.inText}`);
    lines.push("");
  });

  return lines.join("\n").trim() + "\n";
}

export function notesMatchingSourceKey(notes: Note[], sourceKey: string): Note[] {
  return notes.filter((n) => sourceKeyForNote(n) === sourceKey);
}
