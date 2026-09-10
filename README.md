# Stay Sticky

Chrome extension that pins sticky notes to any webpage, plus a companion web
library that gathers every note into one place.

- **Extension** — notes stay on the page where you wrote them (`chrome.storage.local`)
- **Web library** — [staysticky-web.vercel.app](https://staysticky-web.vercel.app)
- **Backend** — Firebase project `staysticky-app` (Spark / free)

## What it does

- **Add a note** — click the extension icon → “Add sticky note to this page.”
  Drag, resize, recolor, or minimize; notes reappear on the same URL path.
- **Sticky Note Bank** — popup lists every note grouped by site; jump back or delete.
- **Web library** — sign in, connect the extension, browse by project / site / date,
  search (`⌘K`), open note detail with the source page still attached.
- **How it works** — [staysticky-web.vercel.app/how-it-works](https://staysticky-web.vercel.app/how-it-works)
- **Draft summaries** — project workspaces build a **free extractive** draft from
  your note text (no paid AI / Cloud Functions).

## Install the extension (unpacked)

1. Open `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this repository root (folder with `manifest.json`).
3. Pin Stay Sticky from the puzzle-piece menu.
4. Copy the extension **ID**.

## Connect extension ↔ web library

1. Open [staysticky-web.vercel.app](https://staysticky-web.vercel.app) (or local `web` app).
2. **Sign in** with Google.
3. Go to **Account & sync** → paste the extension ID → **Connect extension**.
4. Notes are pulled from `chrome.storage.local` via `background.js` and written to
   Firestore under your user when sync is on.

`manifest.json` already allows `http://localhost:3000/*` and `https://*.vercel.app/*`
through `externally_connectable`. Full steps: [`web/CONNECT.md`](web/CONNECT.md).

## Companion site (local)

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — Firebase web keys are in `.env.example` / Vercel project
`staysticky-web`. Redeploy with `cd web && npx vercel --prod`.

After any new production domain, add it under Firebase Auth → Authorized domains
([console](https://console.firebase.google.com/project/staysticky-app/authentication/settings)).

## Project structure

```
manifest.json          Chrome MV3 config + externally_connectable
background.js          Service worker — web ↔ extension note bridge
shared/utils.js        Storage helpers (content script + popup)
content/               On-page sticky notes
popup/                 Toolbar popup + note bank
web/                   Next.js companion library (Vercel)
  CONNECT.md           Deploy + extension linking guide
firebase.json          Firebase project staysticky-app
firestore.rules        Owner-scoped notes / projects / settings
```

## Backend

| Piece | Detail |
| --- | --- |
| Project | `staysticky-app` |
| Plan | Spark (free) — chosen over Supabase so the free tier never pauses |
| Auth | Google sign-in |
| Data | `users/{uid}/notes/{noteId}`, `users/{uid}/projects/{projectId}` |
| Hosting | Vercel → https://staysticky-web.vercel.app |
| Summaries | Client-side extractive drafts only (no Blaze / AI APIs) |

## Web routes

| Path | Screen |
| --- | --- |
| `/` | Landing |
| `/how-it-works` | How it works slides |
| `/notes` | All notes |
| `/notes/recent` | Recently updated |
| `/notes/archive` | Archive |
| `/p/:projectId` | Project workspace + draft summary |
| `/search` | Search |
| `/n/:noteId` | Note detail |
| `/account` | Account & extension linking |

More detail: [`web/README.md`](web/README.md).
