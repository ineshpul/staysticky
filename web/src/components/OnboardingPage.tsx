"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LandingHeader } from "@/components/LandingHeader";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { CHROME_STORE_URL, getExtensionInstallHref } from "@/lib/extension";
import {
  connectToExtension,
  humanizeExtensionError,
  mergeExtensionImport,
  shouldAutoLinkExtension,
} from "@/lib/extension-sync";
import { useExtensionLink } from "@/lib/use-extension-link";

export function OnboardingPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/notes";
  const { user, loading, signIn } = useAuth();
  const { notes, importNotes, importProjects } = useLibrary();
  const { linked, ready, refresh } = useExtensionLink();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  const installHref = getExtensionInstallHref();

  useEffect(() => {
    if (!ready || loading) return;
    if (user && linked) {
      router.replace(nextPath.startsWith("/") ? nextPath : "/notes");
    }
  }, [ready, loading, user, linked, nextPath, router]);

  const notesRef = useRef(notes);
  notesRef.current = notes;

  async function ingest(): Promise<{ ok: boolean; message: string; imported: number }> {
    const res = await connectToExtension();
    if (!res.ok) return { ok: false, message: res.message, imported: 0 };
    refresh();
    const { notes: merged, projects } = mergeExtensionImport(
      notesRef.current,
      res.notes,
      res.projects,
    );
    await importNotes(merged);
    if (projects.length) await importProjects(projects);
    return { ok: true, message: res.message, imported: merged.length };
  }

  useEffect(() => {
    if (!ready || loading || !user || linked || autoTried.current) return;
    if (!shouldAutoLinkExtension()) return;
    autoTried.current = true;
    void ingest();
    // Probe once after sign-in; ingest reads the latest notes via notesRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loading, user, linked]);

  const step = useMemo(() => {
    if (!user) return 1;
    if (!linked) return 2;
    return 3;
  }, [user, linked]);

  async function connect() {
    if (!user) {
      await signIn();
      return;
    }
    setBusy(true);
    setStatus("Connecting…");
    try {
      const res = await ingest();
      if (!res.ok) {
        setStatus(humanizeExtensionError(res.message));
        return;
      }
      setStatus(`Linked. Imported ${res.imported} notes.`);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !ready) {
    return (
      <div className="marketing-wrap" style={{ minHeight: "70vh" }}>
        <LandingHeader />
        <button
          type="button"
          onClick={() => router.push("/")}
          style={{
            margin: "36px 0 0",
            padding: 0,
            border: "none",
            background: "none",
            color: "#6E6A62",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <p style={{ marginTop: 16, color: "#6E6A62" }}>Preparing setup…</p>
      </div>
    );
  }

  return (
    <div className="marketing-wrap" style={{ maxWidth: 720 }}>
      <LandingHeader />

      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
          }
          router.push("/");
        }}
        style={{
          margin: "36px 0 0",
          padding: 0,
          border: "none",
          background: "none",
          color: "#6E6A62",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>

      <p
        className="font-mono"
        style={{
          margin: "14px 0 12px",
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
        Install the Chrome extension, sign in, and connect once. After that, notes sync into your
        library automatically.
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
          title="Install and connect the extension"
          done={linked}
          active={step === 2}
          body={
            linked ? (
              <p style={{ margin: 0, fontSize: 14, color: "#6E6A62" }}>
                Extension linked. Sync will run automatically while you use the library.
              </p>
            ) : (
              <div>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "#6E6A62", lineHeight: 1.55 }}>
                  Add Stay Sticky from the Chrome Web Store, then connect it to this site. Stay in
                  Chrome — the library talks to the extension in your browser.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="btn-ghost"
                    href={installHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Add to Chrome
                  </a>
                  <button
                    type="button"
                    className="btn-dark"
                    disabled={busy || !user}
                    onClick={() => void connect()}
                  >
                    {busy ? "Connecting…" : "Connect extension"}
                  </button>
                </div>
                {!user && (
                  <p style={{ margin: "12px 0 0", fontSize: 13, color: "#8B867C" }}>
                    Sign in first, then connect.
                  </p>
                )}
                {status && (
                  <p style={{ margin: "12px 0 0", fontSize: 13, color: "#4A463F" }}>
                    {status}{" "}
                    {status.includes("reachable") ? (
                      <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
                        Open the listing
                      </a>
                    ) : null}
                  </p>
                )}
              </div>
            )
          }
        />

        <Step
          n={3}
          title="Open your library"
          done={linked}
          active={step === 3}
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
                Finish connecting first — the library stays locked until the extension is linked.
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
