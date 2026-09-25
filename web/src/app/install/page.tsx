"use client";

import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import { CHROME_STORE_URL } from "@/lib/extension";

export default function InstallPage() {
  return (
    <div className="marketing-wrap">
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
        Install
      </p>
      <h1
        className="font-display"
        style={{ margin: "0 0 14px", fontSize: 38, letterSpacing: "-0.015em" }}
      >
        Add Stay Sticky to Chrome
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: 16, lineHeight: 1.6, color: "#4A463F" }}>
        Install from the Chrome Web Store, then come back here to sign in and connect. The library
        talks to that same published extension — no developer mode or ID copying.
      </p>

      <a className="btn-dark" href={CHROME_STORE_URL} target="_blank" rel="noreferrer">
        Open Chrome Web Store
      </a>

      <div className="flex flex-wrap gap-3" style={{ marginTop: 28 }}>
        <Link href="/onboarding" className="btn-dark">
          Continue setup
        </Link>
        <Link href="/how-it-works" className="btn-ghost">
          How it works
        </Link>
      </div>

      <p style={{ margin: "36px 0 0", fontSize: 13, color: "#8B867C", lineHeight: 1.6 }}>
        Building from source? Load this repo unpacked in{" "}
        <code>chrome://extensions</code>, then use{" "}
        <Link href="/account" style={{ textDecoration: "underline" }}>
          Account & sync
        </Link>{" "}
        → “Using a local unpacked build?” to connect that ID.
      </p>
    </div>
  );
}
