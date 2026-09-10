# Publish Stay Sticky to the Chrome Web Store

You already paid the $5 developer registration. Next:

1. Open https://chrome.google.com/webstore/devconsole
2. **New item** → upload `staysticky-extension.zip` (built from this repo; see below)
3. Fill listing: name, short description, detailed description, screenshots, category
4. Privacy: single purpose (“Pin sticky notes on web pages and sync them to your Stay Sticky library”)
5. Submit for review

After approval you get a **stable extension ID** and a public URL like:

`https://chrome.google.com/webstore/detail/stay-sticky/<STABLE_ID>`

That ID is the same for everyone (unlike unpacked IDs such as
`megooakknipiikpoiojomncdoiidhjoc`, which is only your local load).

Then tell me the Store URL / ID and we will:
- Point **Add to Chrome** / **Extension** links at the Store
- Set `NEXT_PUBLIC_EXTENSION_ID` + `NEXT_PUBLIC_CHROME_STORE_URL` on Vercel
- Pre-fill Account & sync so users do not paste an ID

## Build the upload zip

From the repo root (PowerShell):

```powershell
$exclude = @('web','.git','.firebase','.firebaserc','firebase.json','firestore.rules','firestore.indexes.json','README.md','.gitignore','node_modules')
# Prefer the prepared zip if present:
# staysticky-extension.zip
```

Or run:

```powershell
.\scripts\pack-extension.ps1
```

Do **not** upload the whole monorepo (no `web/`, no Firebase config).
