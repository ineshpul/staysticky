# Stay Sticky

A Chrome (Manifest V3) extension for pinning virtual sticky notes to any webpage —
take notes on sites without ever leaving the tab. Notes stick to the exact spot
on the page you dropped them at, and reappear automatically — same spot, same
text — every time you come back.

## What it does

- **Add a note** — click the extension icon, then "Add sticky note to this
  page." A note appears on the page itself, ready to type in and drag
  anywhere you like.
- **Persistence** — notes are saved per page (matched by URL, ignoring query
  strings/hashes) in `chrome.storage.local`, and reappear at the same
  position with the same text on every future visit to that page.
- **Sticky Note Bank** — the popup lists every note you've placed, grouped by
  site. Click one to jump straight to that page; click the ✕ to delete it.
- **Resize** — drag the grip in a note's bottom-right corner to resize it.
- **Minimize** — click the − button to collapse a note into a small pill in a
  tray fixed to the top-right of the screen; click the pill to restore it to
  its original spot and size.
- 5 note colors, drag-to-reposition, click-to-edit text.

## Install (unpacked, for development)

1. Open `chrome://extensions` in Chrome.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select this `stay-sticky-extension` folder.
4. Pin the extension from the puzzle-piece menu so it's easy to reach.

## A note on "hosting via Vercel"

The one-pager mentioned hosting via Vercel — that doesn't quite apply here.
Browser extensions run inside the browser itself (they need permission to
inject content into pages and to read `chrome.storage`), so they can't be
served from a regular web host like Vercel. The real distribution path is
the Chrome Web Store (a one-time developer registration + review process).
Vercel would only come into play for a separate companion site (e.g. a
marketing/landing page), which is unrelated to the extension's actual
functionality.

## Project structure

```
manifest.json         Extension config (MV3)
shared/utils.js        Storage helpers shared by content script + popup
content/content.js     Renders/persists sticky notes on the page
content/content.css    Sticky note styling
popup/popup.html/.js/.css   Toolbar popup: add-note button + note bank
icons/                 Generated PNG icons
```

## Known limitations / next steps

- Notes are positioned in page (document) coordinates, so they scroll with
  the page content rather than staying fixed to the viewport.
- No login/sync — notes live in the local browser's storage only. Syncing
  across devices would mean switching to `chrome.storage.sync` (much lower
  quota) or a real backend.
