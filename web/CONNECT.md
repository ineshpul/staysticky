# Stay Sticky — Vercel + extension connect

## Deploy the web library

1. Install / log in to Vercel CLI once:
   ```bash
   cd web
   npx vercel login
   ```
2. Link and deploy from `web/`:
   ```bash
   npx vercel
   npx vercel --prod
   ```
3. In the Vercel project → Settings → Environment Variables, add every
   `NEXT_PUBLIC_FIREBASE_*` key from `.env.local` (and optionally
   `NEXT_PUBLIC_EXTENSION_ID` after you know it).
4. In Firebase Console → Authentication → Settings → Authorized domains,
   add your `*.vercel.app` domain (and custom domain if you add one).

## Connect the Chrome extension

1. `chrome://extensions` → Developer mode → **Load unpacked** → choose this
   repo root (the folder with `manifest.json`).
2. Copy the extension **ID**.
3. Open the deployed site (or `http://localhost:3000`) → **Account & sync**.
4. Paste the ID → **Connect extension**.
5. The site calls `chrome.runtime.sendMessage` into the extension background
   worker (`background.js`), which returns notes from `chrome.storage.local`.
6. When signed in, those notes are written to Firestore under your user.

`manifest.json` already allows:

- `http://localhost:3000/*`
- `http://127.0.0.1:3000/*`
- `https://*.vercel.app/*`

If you use a custom domain, add it to `externally_connectable.matches` and
reload the extension.
