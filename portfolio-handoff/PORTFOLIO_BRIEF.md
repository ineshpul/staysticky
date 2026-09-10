# Portfolio handoff — Stay Sticky

Use this file in the **portfolio** Cursor workspace (`ineshportfolio`) to add Stay Sticky as **case study 03**, matching Leap / FinDi.

---

## How your portfolio frames work (from live site)

Site: https://ineshportfolio.vercel.app/

### Home · Selected work cards
Pattern for each project:
- Numbered index: `01`, `02`, …
- **Title**
- **1 short paragraph** — product in plain language (what it does + why it matters)
- Optional tags (Leap uses: `0 → 1`, `User research`, `Go-to-market`)
- Meta: **Owner**, **Role**
- Links: live product / store / “in progress” note
- Card is clickable → dedicated case-study route

Current:
| # | Project | Role framing |
|---|---------|----------------|
| 01 | Leap | Founder · product narrative · App Store + site |
| 02 | FinDi | Product Development Intern · partner accountability |

Stay Sticky should be **03** — builder / 0→1 product, not internship.

### Case study page pattern (`/leap`)
- Header: `← Inesh Pulugurtha` · `CASE STUDY 0X - NAME` · `Next: …` · `Ask about it`
- Eyebrow: `FOUNDER • PRODUCT • 2026` style tags
- Big title + icon
- Hero blurb (same voice as home card, can be slightly longer)
- CTAs: primary live link + secondary link
- Meta row: **Owner · Role · Timeline · North star**
- Tabs: `01 Background` · `02 Demo` · `03 Current Traction` (or similar)
- Background: origin story → problem statement → mission
- Visuals: dark brand card / screenshots / demo media
- Footer nav: back to home · next case study

Voice: conversational, concrete, product-first. Not corporate. Not “I built a CRUD app.”

---

## Suggested Stay Sticky framing

### Positioning (one line)
Sticky notes that live on the page while you read — then compile into one searchable web library.

### Home card copy (Selected work · 03)

**Title:** Stay Sticky  

**Blurb:**
> Pin sticky notes on any webpage without leaving the tab. Notes stay where you left them, then sync into a web library grouped by project — still attached to the source page — so every thought you had while reading lives in one place.

**Tags:** `0 → 1` · `Chrome extension` · `Full-stack`

**Owner:** Inesh Pulugurtha  
**Role:** Builder  

**Links:**
- Primary: https://staysticky-web.vercel.app ↗  
- Secondary: https://github.com/ineshpul/staysticky ↗  
- Optional note: `Chrome Web Store · in review` (update when live)

### Case study route
`/staysticky`  
Next from FinDi → Stay Sticky; Next from Stay Sticky → (loop or end)

### Case study hero meta
| Field | Value |
|--------|--------|
| Eyebrow | `BUILDER • PRODUCT • 2026` |
| Owner | Inesh Pulugurtha |
| Role | Builder |
| Timeline | Sep 2026 – Present |
| North star | Notes synced / weekly active readers *(or “Notes created” until you have analytics)* |

### Hero CTAs
1. **Open the library ↗** → https://staysticky-web.vercel.app  
2. **GitHub ↗** → https://github.com/ineshpul/staysticky  
3. Later: **Add to Chrome ↗** → Store URL  

### Tabs (mirror Leap)

**01 Background**
- Started from a real friction: research / reading leaves thoughts scattered across tabs, Notion dumps, and screenshots that lose context.
- Existing sticky extensions keep notes local; the missing piece was a **compiled library** still linked to the source page.
- Built extension + companion site end-to-end: local notes → Firebase sync → project workspace with free extractive drafts (no paid AI).

**Problem statement**
> Reading and research create thoughts in the moment, but those thoughts usually die in the wrong tool — or never leave the browser tab. People need capture *where* the idea happened, and a library *after*.

**Mission**
> Stay Sticky makes every thought you have while reading stick to the page — then show up in one place, still attached to where it came from.

**02 Demo**
- Screens / flows: extension note on a page → popup bank → web library (All notes / project workspace / Account & sync)
- Live: https://staysticky-web.vercel.app/notes (demo library without login)
- Install guide: https://staysticky-web.vercel.app/install  

**03 Current Traction**
- Chrome Web Store developer registration complete; listing in review / submitted
- Live companion app on Vercel + Firebase (`staysticky-app`)
- Public repo for transparency: https://github.com/ineshpul/staysticky  

### Stack (for a tech line if the case study shows it)
Chrome MV3 · vanilla JS extension · Next.js · Firebase Auth/Firestore · Vercel · free extractive summaries (no Cloud Functions)

---

## Files to attach in the portfolio Cursor chat

Attach / open these from this repo:

| File | Why |
|------|-----|
| `portfolio-handoff/PORTFOLIO_BRIEF.md` | This brief (same content) |
| `portfolio-handoff/staysticky-icon-128.png` | App / case-study icon |
| `portfolio-handoff/staysticky-logo-lockup.png` | Logo mark |
| `portfolio-handoff/extension-icon-128.png` | Extension store-style icon |
| Optional: screenshots you take of https://staysticky-web.vercel.app and the extension on a page |

Also point the other agent at:
- Portfolio: https://ineshportfolio.vercel.app/ (patterns: `/leap`, `/findi`)
- Live product: https://staysticky-web.vercel.app  
- Repo: https://github.com/ineshpul/staysticky  

---

## Paste this into the other Cursor chat

```
Add Stay Sticky as Selected work 03 + a full case study page at /staysticky, matching the Leap/FinDi pattern on https://ineshportfolio.vercel.app/

Use the attached PORTFOLIO_BRIEF.md and logo PNGs in portfolio-handoff/.

Home card:
- Number 03
- Title: Stay Sticky
- Blurb: Pin sticky notes on any webpage without leaving the tab. Notes stay where you left them, then sync into a web library grouped by project — still attached to the source page — so every thought you had while reading lives in one place.
- Tags: 0 → 1 · Chrome extension · Full-stack
- Owner: Inesh Pulugurtha · Role: Builder
- Links: staysticky-web.vercel.app, github.com/ineshpul/staysticky, note “Chrome Web Store · in review”

Case study /staysticky should mirror /leap:
- CASE STUDY 03 - STAY STICKY
- Eyebrow BUILDER • PRODUCT • 2026
- Meta: Owner / Role / Timeline Sep 2026–Present / North star
- Tabs: 01 Background, 02 Demo, 03 Current Traction
- CTAs: Open the library, GitHub
- Use staysticky-icon-128.png as the project icon
- Keep the same visual language as Leap (forest green portfolio system) — don’t restyle the whole site

Also update FinDi “Next” to Stay Sticky and home Selected work count if shown.
```

---

## Brand note
Portfolio visual system stays **forest green / IP portfolio**. Stay Sticky’s yellow sticky mark is the **project icon**, not a reason to retheme the whole portfolio.
