"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { formatRelative } from "@/lib/utils";
import { withProjectCounts } from "@/lib/summary";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signIn } = useAuth();
  const { notes, projects, usingDemo, lastSyncedAt } = useLibrary();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const activeNotes = useMemo(() => notes.filter((n) => !n.archived), [notes]);
  const projectRows = useMemo(
    () => withProjectCounts(projects, notes),
    [projects, notes],
  );

  const initials = (profile?.displayName || user?.displayName || "SS")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ color: "#6E6A62" }}>
        Loading library…
      </div>
    );
  }

  if (!user && !usingDemo) {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <button type="button" className="btn-dark" onClick={() => void signIn()}>
          Sign in to continue
        </button>
      </div>
    );
  }

  const navItem = (href: string, label: string, count?: number) => {
    const active = pathname === href || (href !== "/notes" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setDrawerOpen(false)}
        className="flex items-center justify-between"
        style={{
          fontSize: 13.5,
          padding: "8px 12px",
          borderRadius: 8,
          fontWeight: active ? 600 : 400,
          background: active ? "rgba(31,29,26,.08)" : "transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "rgba(31,29,26,.05)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = active ? "rgba(31,29,26,.08)" : "transparent";
        }}
      >
        <span>{label}</span>
        {typeof count === "number" && (
          <span className="font-mono" style={{ fontSize: 11, color: "#A29C90" }}>
            {count}
          </span>
        )}
      </Link>
    );
  };

  const sidebar = (
    <aside
      className="flex flex-col gap-6"
      style={{
        background: "#F2F0EA",
        borderRight: "1px solid rgba(31,29,26,.10)",
        padding: "22px 18px",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/notes" onClick={() => setDrawerOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/staysticky-logo-lockup.png" alt="Stay Sticky" style={{ height: 34 }} />
        </Link>
        <button
          type="button"
          className="md:hidden btn-ghost"
          style={{ padding: "4px 10px" }}
          onClick={() => setDrawerOpen(false)}
        >
          Close
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setDrawerOpen(false);
          router.push("/search");
        }}
        className="flex w-full items-center justify-between"
        style={{
          background: "#FBFAF7",
          border: "1px solid rgba(31,29,26,.12)",
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 13.5,
          color: "#6E6A62",
          cursor: "pointer",
        }}
      >
        <span>Search notes</span>
        <span className="font-mono" style={{ fontSize: 11 }}>
          ⌘K
        </span>
      </button>

      <nav className="flex flex-col gap-1">
        {navItem("/notes", "All notes", activeNotes.length)}
        {navItem("/notes/recent", "Recently visited")}
        {navItem("/notes/archive", "Archive", notes.filter((n) => n.archived).length)}
      </nav>

      <div>
        <div
          className="font-mono"
          style={{
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            color: "#A29C90",
            padding: "0 12px",
            marginBottom: 8,
          }}
        >
          Projects
        </div>
        <div className="flex flex-col gap-1">
          {projectRows.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.id}`}
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13.5,
                background: pathname === `/p/${p.id}` ? "rgba(31,29,26,.08)" : "transparent",
                fontWeight: pathname === `/p/${p.id}` ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: p.color,
                  border: "1px solid rgba(31,29,26,.2)",
                  flexShrink: 0,
                }}
              />
              <span className="truncate flex-1">{p.name}</span>
              <span className="font-mono" style={{ fontSize: 11, color: "#A29C90" }}>
                {p.noteCount}
              </span>
            </Link>
          ))}
          {!projectRows.length && (
            <p style={{ padding: "8px 12px", fontSize: 13, color: "#8B867C" }}>
              Projects appear as notes sync.
            </p>
          )}
        </div>
      </div>

      <Link
        href="/account"
        onClick={() => setDrawerOpen(false)}
        className="flex items-center gap-3 mt-auto"
        style={{ padding: "8px 4px" }}
      >
        <span
          className="grid place-items-center font-mono"
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "#C8E6C9",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {initials}
        </span>
        <span className="min-w-0">
          <div style={{ fontSize: 13.5, fontWeight: 500 }} className="truncate">
            {profile?.displayName || (usingDemo ? "Demo library" : "Reader")}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: "#8B867C" }}>
            {usingDemo
              ? "preview data"
              : lastSyncedAt
                ? `synced ${formatRelative(lastSyncedAt)}`
                : "waiting for sync"}
          </div>
        </span>
      </Link>
    </aside>
  );

  return (
    <div className="app-shell min-h-screen">
      <div className="app-shell-sidebar hidden md:block">{sidebar}</div>
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40" style={{ background: "rgba(31,29,26,.35)" }}>
          <div className="h-full w-[min(86vw,280px)]" style={{ background: "#F2F0EA" }}>
            {sidebar}
          </div>
        </div>
      )}
      <main style={{ padding: "34px clamp(20px,4vw,48px) 60px", minWidth: 0 }}>
        <button
          type="button"
          className="md:hidden btn-ghost mb-4"
          onClick={() => setDrawerOpen(true)}
        >
          Menu
        </button>
        {usingDemo && (
          <div
            className="mb-5 flex flex-wrap items-center justify-between gap-3"
            style={{
              background: "#FBFAF7",
              border: "1px solid rgba(31,29,26,.10)",
              borderRadius: 4,
              padding: "12px 14px",
              fontSize: 13.5,
              color: "#4A463F",
            }}
          >
            <span>Browsing example notes. Sign in to sync your extension library.</span>
            <button type="button" className="btn-dark" onClick={() => void signIn()}>
              Sign in
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
