# Stay Sticky web library

Companion site for the Stay Sticky Chrome extension. Notes sync into Firebase
(`staysticky-app`) and render in a project library hosted on Vercel.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Firebase Auth (Google) + Cloud Firestore on the free Spark plan
- Free extractive project summaries (no paid AI / Cloud Functions)

## Local development

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

## Connect the extension

1. Load the repo root as an unpacked extension in `chrome://extensions`.
2. Copy the extension ID.
3. Sign in on the web app → **Account & sync** → paste the ID → **Connect extension**.
4. After you deploy to Vercel, add your production domain under
   `externally_connectable.matches` in [`../manifest.json`](../manifest.json)
   (already includes `https://*.vercel.app/*` and localhost).

## Deploy on Vercel

From `web/`:

```bash
npx vercel
```

Set the same `NEXT_PUBLIC_FIREBASE_*` env vars in the Vercel project settings.
Also add your Vercel domain to Firebase Auth → Authorized domains.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Landing |
| `/how-it-works` | How it works slides |
| `/notes` | All notes library |
| `/notes/recent` | Recently updated |
| `/notes/archive` | Archive |
| `/p/:projectId` | Project workspace + draft summary |
| `/search` | Search (`⌘K`) |
| `/n/:noteId` | Note detail |
| `/account` | Account & extension linking |
