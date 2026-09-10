"use client";

import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import { isChromeStoreLinked } from "@/lib/extension";

export default function InstallPage() {
  const storeLive = isChromeStoreLinked();
  const storeUrl = process.env.NEXT_PUBLIC_CHROME_STORE_URL;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 32px 80px" }}>
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
        {storeLive
          ? "Install from the Chrome Web Store, then come back here to open your library and connect sync."
          : "The Chrome Web Store listing is still in review. Until it is live, install the unpacked extension from this project (same build you submitted)."}
      </p>

      {storeLive && storeUrl ? (
        <a className="btn-dark" href={storeUrl} target="_blank" rel="noreferrer">
          Open Chrome Web Store
        </a>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(31,29,26,.10)",
            borderRadius: 4,
            padding: 24,
          }}
        >
          <ol style={{ margin: 0, paddingLeft: 20, color: "#4A463F", fontSize: 15, lineHeight: 1.7 }}>
            <li>
              Download the extension package:{" "}
              <a
                href="https://github.com/ineshpul/staysticky/archive/refs/heads/main.zip"
                style={{ color: "#1F1D1A", textDecoration: "underline" }}
              >
                staysticky main.zip
              </a>
            </li>
            <li>Unzip it. Use the folder that contains <code>manifest.json</code> (repo root).</li>
            <li>
              Open <code>chrome://extensions</code> → turn on <strong>Developer mode</strong> →{" "}
              <strong>Load unpacked</strong> → select that folder.
            </li>
            <li>Pin Stay Sticky from the puzzle icon.</li>
            <li>
              Come back here →{" "}
              <Link href="/account" style={{ textDecoration: "underline" }}>
                Account & sync
              </Link>{" "}
              → paste your extension ID from <code>chrome://extensions</code> → Connect.
            </li>
          </ol>
          <p style={{ margin: "18px 0 0", fontSize: 13.5, color: "#8B867C" }}>
            After the Store listing is approved, this page will send people straight to the one-click
            install.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3" style={{ marginTop: 28 }}>
        <Link href="/notes" className="btn-dark">
          Open my library
        </Link>
        <Link href="/how-it-works" className="btn-ghost">
          How it works
        </Link>
      </div>
    </div>
  );
}
