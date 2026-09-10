# Stay Sticky web library

Companion site for the Stay Sticky Chrome extension.

**Live:** [https://staysticky-web.vercel.app](https://staysticky-web.vercel.app)

Notes sync into Firebase (`staysticky-app`) and render in a project library
hosted on Vercel.

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

1. Load the **repo root** as an unpacked extension in `chrome://extensions`.
2. Copy the extension ID.
3. Open the site → **Account & sync** → paste the ID → **Connect extension**.
4. `externally_connectable` in [`../manifest.json`](../manifest.json) already
   includes localhost and `https://*.vercel.app/*`.

Step-by-step: [`CONNECT.md`](CONNECT.md).

## Deploy

Project is linked as Vercel `staysticky-web`. Firebase `NEXT_PUBLIC_*` env vars
are set on the project. Redeploy:

```bash
npx vercel --prod
```

Add any new domain in Firebase Auth → Authorized domains.

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
