"use client";

import { useRouter } from "next/navigation";
import type { Note } from "@/lib/types";
import { formatShortDate, hostnameOf } from "@/lib/utils";

const ROTATIONS = [-1.4, 1.1, -0.6, 1.6, -1.9, 0.8];

export function NoteCard({
  note,
  index = 0,
  showDate = true,
}: {
  note: Note;
  index?: number;
  showDate?: boolean;
}) {
  const router = useRouter();
  const rotate = ROTATIONS[index % ROTATIONS.length];
  const sourceUrl = note.url || note.pageKey || "";
  const host = hostnameOf(sourceUrl);

  return (
    <div
      role="link"
      tabIndex={0}
      className="note-card"
      style={{
        background: note.color || "#FFF59D",
        transform: `rotate(${rotate}deg)`,
        cursor: "pointer",
      }}
      onClick={() => router.push(`/n/${note.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/n/${note.id}`);
        }
      }}
    >
      <div
        style={{
          height: 20,
          background: "rgba(0,0,0,.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
          paddingRight: 8,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgba(0,0,0,.16)" }} />
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgba(0,0,0,.16)" }} />
      </div>
      <div
        style={{
          padding: "14px 14px 12px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: showDate ? 13.5 : 13,
            lineHeight: 1.5,
            color: "#2b2b2b",
            flex: 1,
          }}
        >
          {note.text || "Empty note"}
        </p>
        <div>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono truncate"
              title="Open original page"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "block",
                fontSize: 10.5,
                color: "rgba(0,0,0,.62)",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              {host || sourceUrl}
            </a>
          ) : (
            <div className="font-mono truncate" style={{ fontSize: 10.5, color: "rgba(0,0,0,.52)" }}>
              Unknown source
            </div>
          )}
          {showDate && (
            <div className="font-mono" style={{ fontSize: 10, color: "rgba(0,0,0,.4)", marginTop: 2 }}>
              {formatShortDate(note.updatedAt || note.createdAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
