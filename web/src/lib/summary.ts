import type { Note, Project } from "./types";

/**
 * Free extractive draft summary — no AI APIs / Cloud Functions.
 * Pulls agreements-style themes from repeated words and first sentences.
 */
export function buildExtractiveSummary(notes: Note[], projectName: string): {
  lede: string;
  paragraphs: string[];
  tags: string[];
} {
  const usable = notes
    .map((n) => (n.text || "").trim())
    .filter((t) => t.length > 0);

  if (usable.length === 0) {
    return {
      lede: `No notes in ${projectName} yet.`,
      paragraphs: [
        "Pin notes on pages while you read. When they sync here, this panel drafts a free summary from their text — no paid AI model required.",
      ],
      tags: [],
    };
  }

  const sentences = usable
    .flatMap((t) => t.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 24);

  const stop = new Set([
    "the", "and", "for", "that", "with", "this", "from", "have", "were",
    "are", "was", "but", "not", "you", "your", "into", "about", "they",
    "their", "what", "when", "where", "which", "while", "than", "then",
    "also", "just", "like", "over", "under", "into", "onto", "been",
    "will", "would", "could", "should", "there", "here", "some", "more",
  ]);

  const counts = new Map<string, number>();
  for (const text of usable) {
    for (const raw of text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
      if (stop.has(raw)) continue;
      counts.set(raw, (counts.get(raw) || 0) + 1);
    }
  }

  const tags = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);

  const topThemes = tags.slice(0, 3);
  const lede =
    topThemes.length > 0
      ? `${projectName} currently clusters around ${topThemes.join(", ")} across ${usable.length} notes.`
      : `${usable.length} notes gathered under ${projectName}.`;

  const highlight = sentences.slice(0, 3);
  const contradictions = usable.filter((t) =>
    /contradict|disagree|vs\.|versus|but |however|check/i.test(t),
  );
  const questions = usable.filter((t) => /\?|open question|todo|follow.?up/i.test(t));

  const paragraphs: string[] = [];
  if (highlight.length) {
    paragraphs.push(
      `Recurring points: ${highlight.map((s) => s.replace(/\s+/g, " ")).join(" · ")}`,
    );
  }
  if (contradictions.length) {
    paragraphs.push(
      `Possible tensions to resolve: ${contradictions
        .slice(0, 2)
        .map((t) => `"${t.slice(0, 120)}${t.length > 120 ? "…" : ""}"`)
        .join("; ")}.`,
    );
  } else {
    paragraphs.push(
      "No strong contradictions were flagged from keyword cues (contradict, however, check). Revisit source pages if claims feel thin.",
    );
  }
  if (questions.length) {
    paragraphs.push(
      `Open threads: ${questions
        .slice(0, 2)
        .map((t) => `"${t.slice(0, 120)}${t.length > 120 ? "…" : ""}"`)
        .join("; ")}.`,
    );
  }

  return { lede, paragraphs, tags };
}

export function projectStats(notes: Note[], projectId: string) {
  const inProject = notes.filter((n) => n.projectId === projectId && !n.archived);
  const sources = new Set(inProject.map((n) => n.pageKey));
  return { noteCount: inProject.length, sourceCount: sources.size, notes: inProject };
}

export function withProjectCounts(projects: Project[], notes: Note[]) {
  return projects.map((p) => {
    const { noteCount, sourceCount } = projectStats(notes, p.id);
    return { ...p, noteCount, sourceCount };
  });
}
