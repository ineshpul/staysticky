"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { LandingHeader } from "./LandingHeader";

export function LandingPage() {
  const { user, signIn } = useAuth();

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "28px 32px 80px",
      }}
    >
      <LandingHeader />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 56,
          alignItems: "center",
          marginTop: 56,
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              margin: "0 0 18px",
              fontSize: "clamp(42px, 6vw, 68px)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "#1F1D1A",
            }}
          >
            Every thought you had while reading, in one place.
          </h1>
          <p
            style={{
              margin: "0 0 26px",
              fontSize: 17,
              lineHeight: 1.55,
              color: "#4A463F",
              maxWidth: "46ch",
            }}
          >
            Stick notes to any page as you read. They stay where you left them, and every one
            of them shows up here, gathered by project, still attached to the source it came
            from.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link href="/notes" className="btn-dark">
                Open my library
              </Link>
            ) : (
              <button type="button" className="btn-dark" onClick={() => void signIn()}>
                Open my library
              </button>
            )}
            <a
              className="btn-ghost"
              href="https://github.com/ineshpul/staysticky"
              target="_blank"
              rel="noreferrer"
            >
              Add to Chrome
            </a>
          </div>
        </div>

        <div style={{ position: "relative", height: 400 }}>
          <div
            style={{
              height: "100%",
              background: "#fff",
              borderRadius: 4,
              border: "1px solid rgba(31,29,26,.10)",
              boxShadow: "0 24px 60px rgba(31,29,26,.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 14px",
                borderBottom: "1px solid rgba(31,29,26,.08)",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: 999, background: "#D0CBC0" }} />
              <span style={{ width: 9, height: 9, borderRadius: 999, background: "#D0CBC0" }} />
              <span style={{ width: 9, height: 9, borderRadius: 999, background: "#D0CBC0" }} />
              <div
                className="font-mono"
                style={{
                  marginLeft: 8,
                  flex: 1,
                  background: "#F0EEE8",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 10,
                  color: "#8B867C",
                }}
              >
                nature.com/articles/light-and-sleep
              </div>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {[70, 92, 86, 60, 88].map((w) => (
                <div
                  key={w}
                  style={{
                    height: 9,
                    width: `${w}%`,
                    borderRadius: 2,
                    background: "#E8E4DB",
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: 118,
              left: 34,
              width: 210,
              background: "#FFF59D",
              borderRadius: 2,
              transform: "rotate(-2.2deg)",
              boxShadow: "0 8px 20px rgba(31,29,26,.16)",
            }}
          >
            <div style={{ height: 22, background: "rgba(0,0,0,.07)" }} />
            <p style={{ margin: 0, padding: 12, fontSize: 13, lineHeight: 1.45, color: "#2b2b2b" }}>
              Contradicts the 2019 paper: check sample size
            </p>
          </div>

          <div
            style={{
              position: "absolute",
              top: 236,
              right: 26,
              width: 196,
              background: "#BBDEFB",
              borderRadius: 2,
              transform: "rotate(1.6deg)",
              boxShadow: "0 8px 20px rgba(31,29,26,.16)",
            }}
          >
            <div style={{ height: 22, background: "rgba(0,0,0,.07)" }} />
            <p style={{ margin: 0, padding: 12, fontSize: 13, lineHeight: 1.45, color: "#2b2b2b" }}>
              Use this chart in the intro section
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
