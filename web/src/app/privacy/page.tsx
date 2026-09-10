import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · Stay Sticky",
  description: "Privacy Policy for the Stay Sticky Chrome extension and companion web library.",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "40px 24px 80px",
        color: "#1F1D1A",
        lineHeight: 1.6,
      }}
    >
      <Link href="/" style={{ color: "#6E6A62", fontSize: 14 }}>
        ← Stay Sticky
      </Link>
      <h1 className="font-display" style={{ fontSize: 38, margin: "24px 0 8px", letterSpacing: "-0.015em" }}>
        Privacy Policy
      </h1>
      <p style={{ color: "#6E6A62", marginTop: 0 }}>
        Effective date: 2026-09-09 · Last updated: 2026-09-09
      </p>

      <p>
        Stay Sticky (“Stay Sticky,” “we,” “us,” or “our”) is a Chrome extension and companion web
        library that lets you pin sticky notes on webpages and optionally sync them to your account.
        This Privacy Policy explains what information we collect, how we use it, and the choices you
        have.
      </p>

      <h2>1. Who this policy covers</h2>
      <p>
        This policy applies to the Stay Sticky Chrome extension, the companion website (including
        staysticky-web.vercel.app and any related domains we operate), and related backend services.
      </p>

      <h2>2. Information we collect</h2>
      <h3>2.1 Information you provide</h3>
      <ul>
        <li>
          Account information when you sign in with Google (for example, your name, email address,
          and profile photo URL) through Firebase Authentication.
        </li>
        <li>
          Sticky note content you create (note text, colors, size/position, minimize state, tags,
          project assignments, and related metadata you choose to save).
        </li>
        <li>
          Optional page context associated with a note (page URL, page title, page path key, and—if
          you enable snapshots—surrounding text or a page snapshot you allow us to store).
        </li>
        <li>Account preferences such as sync, auto-grouping, and snapshot settings.</li>
      </ul>

      <h3>2.2 Information stored on your device</h3>
      <p>
        By default, notes are stored locally in your browser using Chrome’s extension storage
        (chrome.storage.local). Local notes remain on your device until you delete them or clear
        extension data.
      </p>

      <h3>2.3 Information synced to our servers (when you connect an account)</h3>
      <p>
        If you sign in and enable sync, we store your notes, projects, and settings in Google
        Firebase (Cloud Firestore) under your user account so you can access them from the companion
        website and across devices.
      </p>

      <h3>2.4 Technical / usage information</h3>
      <p>
        Our hosting and authentication providers (for example Vercel and Google Firebase) may
        automatically process standard technical data such as IP address, browser type, device
        information, timestamps, and security logs needed to operate and protect the service. We do
        not use this to build advertising profiles.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>
          Provide, maintain, and improve the extension and web library (display notes, sync, search,
          project grouping, and draft extractive summaries generated from your note text without
          selling your content to advertisers).
        </li>
        <li>Authenticate you and keep your data associated with your account.</li>
        <li>Respond to support requests and communicate about the service when needed.</li>
        <li>Protect security, prevent abuse, and comply with legal obligations.</li>
      </ul>

      <h2>4. How we share information</h2>
      <p>
        We do not sell your personal information. We do not share your note content with third
        parties for advertising.
      </p>
      <p>We use service providers who process data on our behalf to run Stay Sticky:</p>
      <ul>
        <li>
          Google Firebase (Authentication and Cloud Firestore) — account and synced note/project
          storage.
        </li>
        <li>Vercel — hosting the companion website.</li>
        <li>Google (as your sign-in provider) when you choose Google Sign-In.</li>
      </ul>
      <p>
        We may disclose information if required by law, legal process, or to protect the rights,
        safety, and security of users or the public.
      </p>

      <h2>5. Chrome extension permissions</h2>
      <p>
        Stay Sticky requests permissions needed for its core features, including storing notes,
        interacting with tabs, and injecting the note UI on pages you visit. Host access is used to
        show notes on webpages. We do not use permissions to scrape unrelated browsing history for
        advertising.
      </p>

      <h2>6. Data retention</h2>
      <p>
        Local notes remain until you delete them or remove/clear the extension. Synced account data
        remains until you delete notes/projects, disconnect sync and delete data, or request account
        deletion. Backup or log copies held by providers may persist for a limited period consistent
        with their policies and our operational needs.
      </p>

      <h2>7. Your choices and rights</h2>
      <ul>
        <li>Use Stay Sticky without signing in (notes stay local only).</li>
        <li>Turn sync and related settings on or off in Account & sync.</li>
        <li>Edit or delete individual notes from the extension or web library.</li>
        <li>Sign out of your account on the website.</li>
        <li>Uninstall the extension and/or clear extension storage in Chrome.</li>
        <li>
          Request access to or deletion of your account data by contacting us (see Contact).
        </li>
      </ul>
      <p>
        Depending on where you live (for example under GDPR or CCPA/CPRA), you may have additional
        rights regarding access, correction, deletion, portability, or opting out of certain
        processing. We will respond to verifiable requests as required by applicable law.
      </p>

      <h2>8. Children’s privacy</h2>
      <p>
        Stay Sticky is not directed to children under 13 (or the minimum age required in your
        jurisdiction), and we do not knowingly collect personal information from children.
      </p>

      <h2>9. International transfers</h2>
      <p>
        Our providers may process data in the United States or other countries. By using Stay Sticky,
        you understand that your information may be transferred to and processed in locations that
        may have different data-protection laws than your home country.
      </p>

      <h2>10. Security</h2>
      <p>
        We use industry-standard safeguards provided by our platforms (including authenticated access
        controls and Firebase security rules that restrict each signed-in user to their own data). No
        method of transmission or storage is 100% secure.
      </p>

      <h2>11. Third-party websites</h2>
      <p>
        Notes can be attached to third-party websites you visit. Those sites have their own privacy
        practices. Stay Sticky does not control third-party site policies.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the updated version with a
        revised “Last updated” date. Continued use of Stay Sticky after changes means you accept the
        updated policy.
      </p>

      <h2>13. Contact</h2>
      <p>
        If you have questions about this Privacy Policy or want to request access or deletion of your
        data, contact:
      </p>
      <p>
        Email:{" "}
        <a href="mailto:pulugurtha.inesh@gmail.com">pulugurtha.inesh@gmail.com</a>
        <br />
        Project: Stay Sticky (Chrome extension + companion web library)
        <br />
        Website:{" "}
        <a href="https://staysticky-web.vercel.app">https://staysticky-web.vercel.app</a>
        <br />
        Source / support:{" "}
        <a href="https://github.com/ineshpul/staysticky">https://github.com/ineshpul/staysticky</a>
      </p>
    </main>
  );
}
