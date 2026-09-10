"use client";

import Link from "next/link";
import { useState } from "react";
import { LandingHeader } from "./LandingHeader";

const SLIDES = [
  {
    title: "Pin thoughts where they happen",
    body: "Install Stay Sticky, open any page, and drop a sticky note right on the passage you care about. Notes stay in place when you come back.",
  },
  {
    title: "Sync to your library",
    body: "Sign in on the web, link the extension from Account & sync, and every note pushes to Firebase under your account — free on Spark, no paid AI required.",
  },
  {
    title: "Browse by project, site, or search",
    body: "The companion site gathers notes into projects, keeps the source URL attached, and drafts a free extractive summary from the note text itself.",
  },
];

export function HowItWorksPage() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  return (
    <div className="marketing-wrap">
      <LandingHeader />

      <section style={{ marginTop: 48, maxWidth: 720 }}>
        <p
          className="font-mono"
          style={{
            margin: "0 0 12px",
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6E6A62",
          }}
        >
          How it works
        </p>
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(31,29,26,.10)",
            borderRadius: 4,
            boxShadow: "0 24px 60px rgba(31,29,26,.10)",
            padding: "34px 32px",
            minHeight: 280,
          }}
        >
          <div className="font-mono" style={{ fontSize: 11, color: "#A29C90", marginBottom: 18 }}>
            STEP {index + 1} / {SLIDES.length}
          </div>
          <h1
            className="font-display"
            style={{
              margin: "0 0 14px",
              fontSize: 38,
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
            }}
          >
            {slide.title}
          </h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "#4A463F", maxWidth: "52ch" }}>
            {slide.body}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginTop: 34 }}>
            <div className="flex gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => setIndex(i)}
                  style={{
                    width: i === index ? 22 : 8,
                    height: 8,
                    borderRadius: 999,
                    border: "none",
                    background: i === index ? "#1F1D1A" : "rgba(31,29,26,.2)",
                    cursor: "pointer",
                    transition: "width .16s ease",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={index === 0}
                onClick={() => setIndex((v) => Math.max(0, v - 1))}
              >
                Back
              </button>
              {index < SLIDES.length - 1 ? (
                <button type="button" className="btn-dark" onClick={() => setIndex((v) => v + 1)}>
                  Next
                </button>
              ) : (
                <Link href="/onboarding" className="btn-dark">
                  Get started
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
