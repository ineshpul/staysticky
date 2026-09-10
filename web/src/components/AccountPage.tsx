"use client";

import { useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { requestExtensionSync } from "@/lib/utils";

export function AccountPage() {
  const { user, profile, signIn, signOut, updateSettings } = useAuth();
  const { notes, usingDemo, lastSyncedAt, importNotes } = useLibrary();
  const [extensionId, setExtensionId] = useState(
    process.env.NEXT_PUBLIC_EXTENSION_ID || "",
  );
  const [status, setStatus] = useState("");
  const [linked, setLinked] = useState(false);

  const settings = profile?.settings || {
    syncEnabled: true,
    autoGroup: true,
    saveSnapshot: false,
  };

  const exportJson = useMemo(() => JSON.stringify(notes, null, 2), [notes]);

  async function connectExtension() {
    if (!extensionId.trim()) {
      setStatus("Paste your Chrome extension ID from chrome://extensions.");
      return;
    }
    localStorage.setItem("ss_extension_id", extensionId.trim());
    const res = await requestExtensionSync(extensionId.trim());
    setLinked(res.ok);
    setStatus(res.message);
    if (res.ok) {
      // Extension may respond with notes in a follow-up; also listen once.
      const chromeApi = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
      chromeApi?.runtime?.sendMessage(
        extensionId.trim(),
        { type: "SS_WEB_GET_NOTES" },
        (response) => {
          if (response?.notes && Array.isArray(response.notes)) {
            void importNotes(
              response.notes.map((n: Record<string, unknown>) => ({
                id: String(n.id),
                pageKey: String(n.pageKey || ""),
                url: String(n.url || ""),
                title: String(n.title || ""),
                text: String(n.text || ""),
                color: String(n.color || "#FFF59D"),
                width: typeof n.width === "number" ? n.width : undefined,
                height: typeof n.height === "number" ? n.height : undefined,
                x: typeof n.x === "number" ? n.x : undefined,
                y: typeof n.y === "number" ? n.y : undefined,
                minimized: Boolean(n.minimized),
                createdAt: Number(n.createdAt) || Date.now(),
                updatedAt: Number(n.updatedAt) || Date.now(),
                projectId: (n.projectId as string) || null,
                tags: Array.isArray(n.tags) ? (n.tags as string[]) : [],
                archived: Boolean(n.archived),
                anchorText: (n.anchorText as string) || null,
                snapshotUrl: (n.snapshotUrl as string) || null,
              })),
            );
            setStatus(`Imported ${response.notes.length} notes from the extension.`);
          }
        },
      );
    }
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 640 }}>
        <h1 className="font-display" style={{ margin: 0, fontSize: 38, letterSpacing: "-0.015em" }}>
          Account & sync
        </h1>
        <p style={{ margin: "10px 0 28px", fontSize: 14.5, color: "#6E6A62" }}>
          Your notes live in the browser until you connect an account. Connecting keeps them
          across devices.
        </p>

        <div
          className="flex flex-wrap items-center gap-4"
          style={{
            background: "#fff",
            border: "1px solid rgba(31,29,26,.10)",
            borderRadius: 4,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "#FFF59D",
              flexShrink: 0,
            }}
          />
          <div className="min-w-0 flex-1">
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>Stay Sticky for Chrome</div>
            <div className="font-mono" style={{ fontSize: 11, color: "#8B867C", marginTop: 4 }}>
              v1.0.0 · {linked ? "connected" : "not linked"} ·{" "}
              {lastSyncedAt
                ? `last sync ${new Date(lastSyncedAt).toLocaleTimeString()}`
                : usingDemo
                  ? "demo data"
                  : "no sync yet"}
            </div>
          </div>
          <span
            style={{
              background: linked ? "#C8E6C9" : "#E6E3DB",
              color: "#1F1D1A",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {linked ? "✓ Linked" : "Not linked"}
          </span>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(31,29,26,.10)",
            borderRadius: 4,
            padding: 22,
            marginBottom: 8,
          }}
        >
          <label style={{ display: "block", fontSize: 14.5, fontWeight: 500, marginBottom: 8 }}>
            Extension ID
          </label>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6E6A62" }}>
            Load the unpacked extension, open chrome://extensions, enable Developer mode, and
            copy the ID. Then connect so this Vercel site can pull your local notes.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={extensionId}
              onChange={(e) => setExtensionId(e.target.value)}
              placeholder="abcdefghijklmnopqrstuvwxyz123456"
              style={{
                flex: 1,
                minWidth: 220,
                border: "1px solid rgba(31,29,26,.16)",
                borderRadius: 8,
                padding: "10px 12px",
                background: "#FBFAF7",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            />
            <button type="button" className="btn-dark" onClick={() => void connectExtension()}>
              Connect extension
            </button>
          </div>
          {status && (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#4A463F" }}>{status}</p>
          )}
        </div>

        {(
          [
            {
              key: "syncEnabled" as const,
              label: "Sync notes to my account",
              help: "Notes stay in this browser until sync is on. With it on, they follow you to any device signed in.",
            },
            {
              key: "autoGroup" as const,
              label: "Group new notes automatically",
              help: "Sorts each new note into a project based on shared sites and keywords. You can always move it.",
            },
            {
              key: "saveSnapshot" as const,
              label: "Save a snapshot of the page",
              help: "Keeps the paragraph a note was attached to, so it still makes sense if the page changes.",
            },
          ] as const
        ).map((row) => (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4"
            style={{
              padding: "18px 2px",
              borderBottom: "1px solid rgba(31,29,26,.10)",
            }}
          >
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 500 }}>{row.label}</div>
              <div style={{ fontSize: 13, color: "#6E6A62", marginTop: 4 }}>{row.help}</div>
            </div>
            <button
              type="button"
              className={`toggle ${settings[row.key] ? "on" : "off"}`}
              aria-pressed={settings[row.key]}
              onClick={() => {
                if (!user) {
                  void signIn();
                  return;
                }
                void updateSettings({ [row.key]: !settings[row.key] });
              }}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-3" style={{ marginTop: 28 }}>
          <button
            type="button"
            className="btn-dark"
            onClick={() => {
              const blob = new Blob([exportJson], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "stay-sticky-notes.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export all {notes.length} notes
          </button>
          {user ? (
            <button type="button" className="btn-ghost" onClick={() => void signOut()}>
              Sign out
            </button>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => void signIn()}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
