"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { formatRelative } from "@/lib/utils";
import { withProjectCounts } from "@/lib/summary";

function parentPath(pathname: string): string | null {
  if (pathname.startsWith("/n/")) return "/notes";
  if (pathname.startsWith("/p/")) return "/notes";
  if (pathname === "/search" || pathname === "/account") return "/notes";
  if (pathname === "/notes/recent" || pathname === "/notes/archive") return "/notes";
  if (pathname === "/how-it-works") return "/";
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signIn } = useAuth();
  const { notes, projects, usingDemo, lastSyncedAt } = useLibrary();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const go = useCallback(
    (href: string) => {
      setDrawerOpen(false);
      if (pathname !== href) router.push(href);
    },
    [pathname, router],
  );

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setDrawerOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        go("/search");
      }
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

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

  const backTo = parentPath(pathname);

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
    const active =
      href === "/notes" ? pathname === "/notes" : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <button
        type="button"
        onClick={() => go(href)}
        className="flex w-full items-center justify-between text-left"
        style={{
          fontSize: 13.5,
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          fontWeight: active ? 600 : 400,
          background: active ? "rgba(31,29,26,.08)" : "transparent",
          color: "#1F1D1A",
        }}
      >
        <span>{label}</span>
        {typeof count === "number" && (
          <span className="font-mono" style={{ fontSize: 11, color: "#A29C90" }}>
            {count}
          </span>
        )}
      </button>
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
        <button
          type="button"
          onClick={() => go("/")}
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
          aria-label="Stay Sticky home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/staysticky-icon-128.png" alt="Stay Sticky" className="site-logo-sm" />
        </button>
        {!isDesktop && (
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: "4px 10px" }}
            onClick={() => setDrawerOpen(false)}
          >
            Close
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => go("/search")}
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
          {projectRows.map((p) => {
            const active = pathname === `/p/${p.id}`;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => go(`/p/${p.id}`)}
                className="flex w-full items-center gap-2 text-left"
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13.5,
                  background: active ? "rgba(31,29,26,.08)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  color: "#1F1D1A",
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
              </button>
            );
          })}
          {!projectRows.length && (
            <p style={{ padding: "8px 12px", fontSize: 13, color: "#8B867C" }}>
              Projects appear as notes sync.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => go("/account")}
        className="flex items-center gap-3 mt-auto text-left"
        style={{
          padding: "8px 4px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#1F1D1A",
        }}
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
      </button>
    </aside>
  );

  return (
    <div className={`app-shell ${isDesktop ? "app-shell-desktop" : "app-shell-mobile"}`}>
      {isDesktop && <div className="app-shell-sidebar-desktop">{sidebar}</div>}

      {!isDesktop && drawerOpen && (
        <div className="app-shell-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="app-shell-drawer-backdrop"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="app-shell-drawer-panel">{sidebar}</div>
        </div>
      )}

      <main className="app-shell-main">
        <div className="app-shell-topbar">
          {!isDesktop && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setDrawerOpen(true)}
            >
              Menu
            </button>
          )}
          {backTo && (
            <button
              type="button"
              onClick={() => go(backTo)}
              style={{
                border: "none",
                background: "transparent",
                color: "#6E6A62",
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← Back
            </button>
          )}
          {!isDesktop && (
            <button
              type="button"
              className="btn-ghost"
              style={{ marginLeft: "auto" }}
              onClick={() => go("/notes")}
            >
              All notes
            </button>
          )}
        </div>

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
