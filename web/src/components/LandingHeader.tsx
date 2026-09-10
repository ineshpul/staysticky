"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const EXTENSION_URL =
  process.env.NEXT_PUBLIC_CHROME_STORE_URL ||
  "https://github.com/ineshpul/staysticky#install-the-extension-unpacked";

export function LandingHeader() {
  const { user, signIn } = useAuth();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/staysticky-logo-lockup.png"
          alt="Stay Sticky"
          style={{ height: 44, width: "auto" }}
        />
      </Link>
      <nav className="flex items-center gap-5" style={{ fontSize: 14, color: "#6E6A62" }}>
        <Link href="/how-it-works">How it works</Link>
        <a href={EXTENSION_URL} target="_blank" rel="noreferrer">
          Extension
        </a>
        {user ? (
          <Link href="/notes" className="btn-dark">
            Open my library
          </Link>
        ) : (
          <button type="button" className="btn-dark" onClick={() => void signIn()}>
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}
