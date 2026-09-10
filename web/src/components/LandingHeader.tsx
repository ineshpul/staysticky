"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getExtensionInstallHref, isChromeStoreLinked } from "@/lib/extension";
import { libraryEntryHref, useExtensionLink } from "@/lib/use-extension-link";

export function LandingHeader() {
  const { user, signIn } = useAuth();
  const { linked, ready } = useExtensionLink();
  const extensionHref = getExtensionInstallHref();
  const external = isChromeStoreLinked();
  const libraryHref = ready ? libraryEntryHref(Boolean(user), linked) : "/onboarding";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/staysticky-mark.png"
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
        {user && linked ? (
          <Link href="/notes" className="btn-dark">
            Open my library
          </Link>
        ) : (
          <Link href={libraryHref} className="btn-dark">
            Get started
          </Link>
        )}
      </nav>
    </header>
  );
}
