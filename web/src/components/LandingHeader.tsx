"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getExtensionInstallHref, isChromeStoreLinked } from "@/lib/extension";

export function LandingHeader() {
  const { user, signIn } = useAuth();
  const extensionHref = getExtensionInstallHref();
  const external = isChromeStoreLinked();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/staysticky-icon-128.png"
          alt="Stay Sticky"
          className="site-logo"
        />
      </Link>
      <nav
        className="flex flex-wrap items-center gap-3 sm:gap-5"
        style={{ fontSize: 14, color: "#6E6A62" }}
      >
        <Link href="/how-it-works">How it works</Link>
        {external ? (
          <a href={extensionHref} target="_blank" rel="noreferrer">
            Extension
          </a>
        ) : (
          <Link href={extensionHref}>Extension</Link>
        )}
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
