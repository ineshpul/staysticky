# Stay Sticky

A Chrome (Manifest V3) extension for pinning virtual sticky notes to any webpage —
take notes on sites without ever leaving the tab. Notes stick to the exact spot
on the page you dropped them at, and reappear automatically — same spot, same
text — every time you come back.

The **companion web library** lives in [`web/`](web/) (Next.js on Vercel) and syncs
notes into Firebase project `staysticky-app`.

## What it does

- **Add a note** — click the extension icon, then "Add sticky note to this
  page." A note appears on the page itself, ready to type in and drag
  anywhere you like.
- **Persistence** — notes are saved per page (matched by URL, ignoring query
  strings/hashes) in `chrome.storage.local`, and reappear at the same
  position with the same text on every future visit to that page.
- **Sticky Note Bank** — the popup lists every note you've placed, grouped by
  site. Click one to jump straight to that page; click the ✕ to delete it.
- **Web library** — sign in on the companion site, connect the extension from
  Account & sync, and browse every note by project, site, date, or search.
- **Draft summaries** — project workspaces build a free extractive summary from
  your note text (no paid AI / Cloud Functions).

## Install (unpacked, for development)

1. Open `chrome://extensions` in Chrome.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this repository root.
4. Pin the extension from the puzzle-piece menu so it's easy to reach.
5. Copy the extension ID, run the web app (`cd web && npm run dev`), sign in,
   and paste the ID under **Account & sync**.

## Companion site (Vercel)

```bash
cd web
cp .env.example .env.local   # Firebase web config already documented there
npm install
npm run dev
npx vercel                   # deploy when ready
```

See [`web/README.md`](web/README.md) for routes and env vars. After deploy, add
your Vercel domain to Firebase Auth → Authorized domains. The extension already
allows `https://*.vercel.app/*` via `externally_connectable`.

## Project structure

```
manifest.json          Extension config (MV3)
background.js          Service worker — web ↔ extension note bridge
shared/utils.js        Storage helpers shared by content script + popup
content/               On-page sticky notes
popup/                 Toolbar popup + note bank
web/                   Next.js companion library (Vercel)
firebase.json          Firebase project staysticky-app
firestore.rules        Owner-scoped note/project rules
```

## Backend

- Firebase project: `staysticky-app` (Spark / free)
- Auth: Google sign-in
- Firestore: `users/{uid}/notes`, `users/{uid}/projects`
- No Cloud Functions required for v1
