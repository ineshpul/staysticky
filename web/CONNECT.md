# Stay Sticky — Vercel + extension connect

Live production URL: https://staysticky-web.vercel.app

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
3. Firebase web env vars are already configured on the `staysticky-web` Vercel project.
   To change them: Vercel → Project → Settings → Environment Variables.
4. In Firebase Console → Authentication → Settings → Authorized domains,
   add `staysticky-web.vercel.app` (and any custom domain).

## Connect the Chrome extension

1. `chrome://extensions` → Developer mode → **Load unpacked** → choose this
   repo root (the folder with `manifest.json`).
2. Copy the extension **ID**.
3. Open https://staysticky-web.vercel.app (or `http://localhost:3000`) → **Account & sync**.
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
