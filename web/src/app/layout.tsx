import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Stay Sticky",
  description: "Every thought you had while reading, in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full"
        style={{
          fontFamily: "var(--font-instrument-sans), system-ui, sans-serif",
          ["--font-ui" as string]: "var(--font-instrument-sans), system-ui, sans-serif",
          ["--font-display" as string]: "var(--font-instrument-serif), Georgia, serif",
          ["--font-mono" as string]: "var(--font-plex-mono), ui-monospace, monospace",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
