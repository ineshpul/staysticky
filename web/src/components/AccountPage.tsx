"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./AppShell";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { CHROME_STORE_URL, STORE_EXTENSION_ID } from "@/lib/extension";
import {
  connectToExtension,
  getSavedExtensionId,
  humanizeExtensionError,
  isExtensionLinked,
  mergeExtensionImport,
  clearExtensionLink,
} from "@/lib/extension-sync";

export function AccountPage() {
  const { user, profile, signIn, signOut, updateSettings } = useAuth();
  const { notes, usingDemo, lastSyncedAt, importNotes, importProjects } = useLibrary();
  const [extensionId, setExtensionId] = useState("");
  const [status, setStatus] = useState("");
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setExtensionId(getSavedExtensionId());
    setLinked(isExtensionLinked());
  }, []);

  const settings = profile?.settings || {
    syncEnabled: true,
    autoGroup: false,
    saveSnapshot: false,
  };

  const exportJson = useMemo(() => JSON.stringify(notes, null, 2), [notes]);

  async function connectExtension() {
    if (!user) {
      setStatus("Sign in first so synced notes can be saved to your account.");
      await signIn();
      return;
    }

    setBusy(true);
    setStatus("Connecting…");
    try {
      const preferred = showAdvanced ? extensionId.trim() : STORE_EXTENSION_ID;
      const res = await connectToExtension(preferred);
      setLinked(res.ok);
      if (!res.ok) {
        setStatus(humanizeExtensionError(res.message));
        return;
      }

      setExtensionId(res.extensionId);
      const { notes: merged, projects } = mergeExtensionImport(notes, res.notes, res.projects);
      await importNotes(merged);
      if (projects.length) await importProjects(projects);
      setStatus(
        `Linked permanently. Imported ${merged.length} notes — Stay Sticky will keep syncing automatically.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function unlink() {
    clearExtensionLink();
    setLinked(false);
    setStatus("Unlinked. You’ll need to connect again before the library opens.");
    window.location.href = "/onboarding";
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 640 }}>
        <h1 className="font-display" style={{ margin: 0, fontSize: 38, letterSpacing: "-0.015em" }}>
          Account & sync
        </h1>
        <p style={{ margin: "10px 0 28px", fontSize: 14.5, color: "#6E6A62" }}>
          Link the Chrome Web Store extension once. After that, notes sync automatically whenever
          you open this library.
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
              Chrome Web Store · {linked ? "auto-sync on" : "not linked"} ·{" "}
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
          <p style={{ margin: "0 0 12px", fontSize: 14.5, fontWeight: 500 }}>
            {linked ? "Connected to the live extension" : "Connect the live extension"}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6E6A62" }}>
            {linked
              ? "This browser is talking to the Stay Sticky you installed from the Chrome Web Store."
              : "Install Stay Sticky from the Chrome Web Store if you haven’t, then connect. You don’t need to copy an extension ID."}
          </p>
          <div className="flex flex-wrap gap-2">
            {!linked && (
              <a className="btn-ghost" href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                Chrome Web Store
              </a>
            )}
            {linked ? (
              <button type="button" className="btn-ghost" onClick={unlink}>
                Unlink
              </button>
            ) : (
              <button
                type="button"
                className="btn-dark"
                disabled={busy}
                onClick={() => void connectExtension()}
              >
                {busy ? "Connecting…" : "Connect once"}
              </button>
            )}
          </div>
          {status && (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#4A463F" }}>{status}</p>
          )}
          {linked && (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#6E6A62" }}>
              Auto-sync runs every few seconds while this site is open, and again whenever you
              return to the tab.
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              marginTop: 16,
              padding: 0,
              border: "none",
              background: "none",
              color: "#8B867C",
              fontSize: 12.5,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {showAdvanced ? "Hide developer options" : "Using a local unpacked build?"}
          </button>
          {showAdvanced && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                Extension ID
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  value={extensionId}
                  onChange={(e) => setExtensionId(e.target.value)}
                  placeholder={STORE_EXTENSION_ID}
                  disabled={linked}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    border: "1px solid rgba(31,29,26,.16)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    background: linked ? "#F2F0EA" : "#FBFAF7",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                />
                {!linked && (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={busy}
                    onClick={() => void connectExtension()}
                  >
                    Connect this ID
                  </button>
                )}
              </div>
            </div>
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
