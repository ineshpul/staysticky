"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LandingHeader } from "@/components/LandingHeader";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { getExtensionInstallHref, isChromeStoreLinked } from "@/lib/extension";
import {
  fetchFromExtension,
  mergeIncomingNote,
  mergeIncomingProject,
  saveExtensionLink,
} from "@/lib/extension-sync";
import { useExtensionLink } from "@/lib/use-extension-link";

export function OnboardingPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/notes";
  const { user, loading, signIn } = useAuth();
  const { notes, importNotes, importProjects } = useLibrary();
  const { linked, extensionId, setExtensionId, ready, refresh } = useExtensionLink();
  const [installedAck, setInstalledAck] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const storeLive = isChromeStoreLinked();
  const installHref = getExtensionInstallHref();

  useEffect(() => {
    if (!ready || loading) return;
    if (user && linked) {
      // Already set up — skip straight into the library.
      router.replace(nextPath.startsWith("/") ? nextPath : "/notes");
    }
  }, [ready, loading, user, linked, nextPath, router]);

  const step = useMemo(() => {
    if (!user) return 1;
    if (!linked && !installedAck) return 2;
    if (!linked) return 3;
    return 4;
  }, [user, linked, installedAck]);

  async function connect() {
    if (!extensionId.trim()) {
      setStatus("Paste your extension ID from chrome://extensions.");
      return;
    }
    if (!user) {
      await signIn();
      return;
    }
    setBusy(true);
    setStatus("Connecting…");
    try {
      const id = extensionId.trim();
      const res = await fetchFromExtension(id);
      if (!res.ok) {
        setStatus(
          res.message ||
            "Could not reach the extension. Open this site in Chrome with Stay Sticky installed.",
        );
        return;
      }
      saveExtensionLink(id);
      refresh();

      const cloudById = new Map(notes.map((n) => [n.id, n]));
      const merged = res.notes.map((incoming) =>
        mergeIncomingNote(cloudById.get(incoming.id), incoming),
      );
      if (res.projects.length) {
        await importProjects(
          res.projects.map((incoming) => mergeIncomingProject(undefined, incoming)),
        );
      }
      await importNotes(merged);
      setStatus(`Linked. Imported ${merged.length} notes.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !ready) {
    return (
      <div className="marketing-wrap" style={{ minHeight: "70vh" }}>
        <LandingHeader />
        <p style={{ marginTop: 48, color: "#6E6A62" }}>Preparing setup…</p>
      </div>
    );
  }

  return (
    <div className="marketing-wrap" style={{ maxWidth: 720 }}>
      <LandingHeader />

      <p
        className="font-mono"
        style={{
          margin: "48px 0 12px",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#6E6A62",
        }}
      >
        Setup
      </p>
      <h1
        className="font-display"
        style={{ margin: "0 0 12px", fontSize: 38, letterSpacing: "-0.015em" }}
      >
        Get Stay Sticky working
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.6, color: "#4A463F" }}>
        The web library only shows notes from the Chrome extension. Finish these steps once — then
        your notes stay synced.
      </p>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 14 }}>
        <Step
          n={1}
          title="Sign in"
          done={Boolean(user)}
          active={step === 1}
          body={
            user ? (
              <p style={{ margin: 0, fontSize: 14, color: "#6E6A62" }}>
                Signed in as {user.email || user.displayName || "your account"}.
              </p>
            ) : (
              <button type="button" className="btn-dark" onClick={() => void signIn()}>
                Continue with Google
              </button>
            )
          }
        />

        <Step
          n={2}
          title="Add the Chrome extension"
          done={linked || installedAck}
          active={step === 2}
          body={
            <div>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6E6A62", lineHeight: 1.55 }}>
                Stay Sticky has to run in Chrome so notes can stick to the pages you read.
              </p>
              {storeLive ? (
                <a className="btn-dark" href={installHref} target="_blank" rel="noreferrer">
                  Add to Chrome
                </a>
              ) : (
                <Link className="btn-dark" href="/install">
                  Install guide
                </Link>
              )}
              {!linked && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ marginLeft: 10 }}
                  onClick={() => setInstalledAck(true)}
                >
                  I installed it
                </button>
              )}
            </div>
          }
        />

        <Step
          n={3}
          title="Link this site to your extension"
          done={linked}
          active={step === 3}
          body={
            linked ? (
              <p style={{ margin: 0, fontSize: 14, color: "#6E6A62" }}>
                Extension linked. Sync will run automatically while you use the library.
              </p>
            ) : (
              <div>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "#6E6A62", lineHeight: 1.55 }}>
                  Open <code>chrome://extensions</code>, turn on Developer mode, copy the Stay Sticky
                  ID, and paste it here.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={extensionId}
                    onChange={(e) => setExtensionId(e.target.value)}
                    placeholder="Extension ID"
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
                  <button
                    type="button"
                    className="btn-dark"
                    disabled={busy}
                    onClick={() => void connect()}
                  >
                    {busy ? "Connecting…" : "Connect extension"}
                  </button>
                </div>
                {status && (
                  <p style={{ margin: "12px 0 0", fontSize: 13, color: "#4A463F" }}>{status}</p>
                )}
              </div>
            )
          }
        />

        <Step
          n={4}
          title="Open your library"
          done={linked}
          active={step === 4}
          body={
            linked ? (
              <button
                type="button"
                className="btn-dark"
                onClick={() => router.replace(nextPath.startsWith("/") ? nextPath : "/notes")}
              >
                Open my library
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "#8B867C" }}>
                Finish linking first — the library stays locked until the extension is connected.
              </p>
            )
          }
        />
      </ol>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  active,
  body,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  body: React.ReactNode;
}) {
  return (
    <li
      style={{
        background: "#fff",
        border: `1px solid ${active ? "rgba(31,29,26,.28)" : "rgba(31,29,26,.10)"}`,
        borderRadius: 4,
        padding: 22,
        opacity: done && !active ? 0.92 : 1,
      }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <span
          className="font-mono grid place-items-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: done ? "#C8E6C9" : active ? "#FFF59D" : "#E6E3DB",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {done ? "✓" : n}
        </span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h2>
      </div>
      {body}
    </li>
  );
}
