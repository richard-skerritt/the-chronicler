# CLAUDE.md — Brain dump for Claude Code

This file is the orientation note for any Claude Code agent working on **The Chronicler**. Read this before opening anything else.

---

## What this project is

**The Chronicler** is an AI-powered tabletop Dungeon Master. The user plays with physical dice + tokens; the app provides streaming Claude narration, a 5e character creator, an ElevenLabs voice, combat/dice helpers, and a session-persisted SQLite-backed campaign.

Repo: <https://github.com/skerrittrichard-hash/the-chronicler>
Default branch: **`master`** (not `main`).

---

## Tech stack — current state

| Layer | What's there |
|---|---|
| Frontend | React 18 + TypeScript, Vite dev server |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives), HSL CSS variables in `client/src/index.css` |
| Typography | **Cinzel Decorative** (titles, headings, buttons) + **Cinzel** (display/body) + **Lora** (narration paragraphs). Loaded via Google Fonts in `client/index.html`. |
| Routing | `wouter` 3 with hash-based routing (`useHashLocation`) — survives iframe embedding |
| State | `@tanstack/react-query` 5; in-memory voice prefs (NOT localStorage — iframe-blocked) in `client/src/lib/preferences.ts` |
| Backend | Node.js + Express 5 |
| AI | `@anthropic-ai/sdk` 0.85, model `claude-sonnet-4-6`, streaming SSE |
| TTS | ElevenLabs (primary, server-proxied returning binary mp3) → Speechify (server-proxied JSON+base64) → Web Speech API (fallback). Code: `server/routes.ts` `/api/tts` and `client/src/lib/tts.ts`. |
| Database | better-sqlite3 + Drizzle ORM. SQLite file `chronicler.db` at CWD. Schema in `shared/schema.ts`, ad-hoc DDL+migrations in `server/db.ts`. |
| Build | Vite for the client; esbuild for the server bundle. Build entrypoint: `script/build.ts`. |
| Dev runtime | `tsx server/index.ts` via `npm run dev`, port 5000. |

---

## Visual design system

### Dragon background

- Asset: **`client/public/crimson_dragon_battle.png`**
- Applied in `client/src/index.css` lines 96–103:
  - `background-attachment: fixed`
  - `background-size: cover`
  - Veiled by `.page-overlay { background: rgba(5, 3, 15, 0.72) }` so text stays readable

### Colour tokens (HSL, in `client/src/index.css` `:root`)

| Token | Value | Role |
|---|---|---|
| `--background` | `246 28% 5%` | Deep midnight purple — page |
| `--card` | `248 24% 8%` | Panel surfaces |
| `--primary` / `--fire` | `18 90% 52%` | Ember fire — primary accent |
| `--ember` | `26 96% 60%` | Brighter ember — narration *em* |
| `--accent` / `--gold` | `42 82% 52%` / `42 88% 56%` | Aged gold — borders, save buttons |
| `--gold-glow` | `44 95% 64%` | Hover glow |
| `--gold-dark` | `38 68% 36%` | Subtle gold borders |
| `--secondary` / `--forest` | `148 30% 11%` / `148 38% 13%` | Deep forest |
| `--forest-mid` | `140 30% 20%` | Lighter forest |
| `--destructive` / `--crimson` | `0 72% 45%` | Blood — danger / low HP |
| `--midnight` | `246 30% 4%` | Near-black for deep shadow |
| `--arcane` | `265 52% 55%` | Magic / spells |
| `--parchment` / `--vellum` | `40 42% 88%` / `37 34% 78%` | Scroll surface |
| `--ink` | `30 24% 16%` | Scroll text colour |
| `--slate-blue` | `222 32% 20%` | Cool stone accent |

A `.light` mode override exists but is essentially unused — the app is dark-first.

### Fonts

| Family | Weights loaded | Purpose | Class hook |
|---|---|---|---|
| Cinzel Decorative | 400 / 700 / 900 | Headings, buttons | applied to `h1–h6, button, .btn`; also via `.font-display` |
| Cinzel | 400 / 600 / 700 / 900 | Display / body, scroll narration | `body { font-family }` |
| Lora | 400 / 500 / 600 + italic 400/500 | Long-form prose | `.font-body`, `.narration` |

Declared in **`client/index.html`** lines 12–13 (single Google Fonts URL preconnects via lines 11–12).

### Scroll component

**`client/src/components/ScrollDisplay.tsx`** — exports:

- `ParchmentScroll` — single DM message rendered as a burned parchment scroll
  - One-shot unroll animation: 0 → measured `scrollHeight`, 1s `cubic-bezier(0.4, 0, 0.2, 1)`, then 600ms text opacity fade
  - Animation only fires for fresh, non-streaming messages (`didAnimate` ref ensures one-shot)
  - SVG mask `TORN_MASK` (built from `_TORN_PATH` cubic beziers) for organic torn edges
  - `PARCHMENT_BG` linear-gradient for charred edges → warm centre → charred edges
  - Charcoal burn overlay (top ~22%) + flame-amber overlay (bottom ~32%) layered above parchment
  - 8 hard-coded `EMBER_SPOTS` (radial-gradient bursts) — currently static positions, no animation
  - Bottom ambient fire glow as a separate radial-gradient ellipse
- `PlayerTablet` — dark stone plaque for player actions, `Cinzel` text on `rgba(20,15,35,0.92)`, gold border, "— THE ADVENTURER" caption
- `ScrollChat` (default export) — wraps the full chat list, distinguishes "latest DM message" (animates) vs "previous" (faded + scaled 0.985)

Used by `client/src/pages/GamePage.tsx` line 15 import, rendered at lines 840 and 882.

### Race portraits

Mapped in **`client/src/pages/CharacterCreatePage.tsx`** lines 27–35:

```
'Human':      '/race-human.png'
'Elf':        '/race-elf.png'
'Dwarf':      '/race-dwarf.png'
'Halfling':   '/race-halfling.png'
'Half-Orc':   '/race-halforc.png'
'Tiefling':   '/race-tiefling.png'
'Gnome':      '/race-gnome.png'
'Dragonborn': '/race-dragonborn.png'
```

All eight files are in `client/public/` (so they're served at the root: `/race-human.png` etc.). There's also an unused intermediate render `client/public/isolated_elf_ranger_white_background.png` — left as a working source.

---

## Today's progress (visual overhaul)

Completed in the recent commits (`1f4226b7`, `f01fac67`, `b0e032c3`, `72d01a12`, plus earlier voice fixes in `61125b6b`):

- Crimson dragon battle background image dropped behind the entire app, fixed-attachment with dark veil overlay
- Switched from generic Tailwind stone palette to a custom dark-fantasy HSL token set (midnight purple + ember + aged gold + forest + crimson + parchment/vellum/ink)
- Cinzel Decorative + Cinzel + Lora wired through `index.html`, `index.css`, and component-level inline styles
- Built `ScrollDisplay.tsx` from scratch — `ParchmentScroll`, `PlayerTablet`, `ScrollChat`
- DM messages now render on the parchment scroll with the unroll animation
- Player messages render on the dark stone tablet
- Replaced all 8 race-step emojis with proper PNG portraits in the character creator
- Initial pass at burned/torn edges using SVG bezier mask + charcoal/fire overlays + ember spots

---

## What still needs work

### Top of the queue — finish the burned scroll

1. **Torn edges still too uniform** — `_TORN_PATH` in `ScrollDisplay.tsx` lines 35–71 needs more irregularity. Some bezier handles are too symmetric. Either hand-tune more variance into the existing path, or generate a noisier path procedurally (Perlin-driven offset on each control point).
2. **Ember animation on scroll edges** — `EMBER_SPOTS` (lines 104–113) are placed but currently rely on a `.ember-spot` CSS class with `animation-delay`. The animation itself isn't defined yet (or isn't strong enough). Goal: embers should drift along the burn line, pulse, and ideally have small ones flickering off the edge into the surrounding dark.
3. **Charcoal top gradient is a hard band** — line 229 (`linear-gradient(180deg, rgba(8,2,0,0.78) 0% → transparent 22%)`). Read as a stripe rather than a fade. Try a multi-stop gradient with mid-tones, or an SVG noise/turbulence overlay specifically on the top region.

### Other outstanding items (carry-overs from README)

- Animated turn order in `CombatTracker`
- Sound effects layered under narration (no SFX system exists yet)
- Multiple campaign support — `storage.getOrCreateDefaultCampaign()` is hardcoded to one row
- Save/load named sessions
- PWA support (no manifest, no service worker)
- Electron packaging
- Custom campaign uploads (system prompt is hardcoded to Heroes-of-the-Borderlands or generic custom)
- **Custom-mode UI parity** — `CharacterPanel`, `CombatTracker`, `DiceGuide`, `SettingsPage` all still hardcode Gideon & Zella. Custom characters from the creator wizard reach the server but aren't fully reflected in these surfaces.
- `StateUpdate` schema (`shared/schema.ts`) lacks `char1MaxHp` / `char2MaxHp` — custom characters can't level-up max HP through the AI state-update channel
- `CharacterCreatePage` only creates `char1`; server already accepts an optional `char2` but there's no UI for a second character

### Known smells worth cleaning up at some point

- `script/build.ts` `allowlist` includes packages that aren't dependencies (axios, openai, stripe, etc.) — template leftover
- `package.json` carries unused deps (`passport`, `passport-local`, `express-session`, `memorystore`)
- `vite.config.ts` aliases `@assets` to `./attached_assets/` which doesn't exist
- `server/static.ts` uses `__dirname` (only safe because the prod build is bundled to CJS)
- `client/src/pages/not-found.tsx` still uses `bg-gray-50` / `text-gray-900` instead of design tokens

---

## Key file map

| Concern | File |
|---|---|
| Design tokens, dragon bg, font hookup | `client/src/index.css` |
| Font CDN load | `client/index.html` |
| Parchment scroll | `client/src/components/ScrollDisplay.tsx` |
| Race portrait map | `client/src/pages/CharacterCreatePage.tsx` (lines 27–35) |
| Race portraits | `client/public/race-{human,elf,dwarf,halfling,halforc,tiefling,gnome,dragonborn}.png` |
| Dragon background | `client/public/crimson_dragon_battle.png` |
| DM streaming + state extraction | `server/routes.ts` `/api/chat` |
| DM personality/rules | `server/systemPrompt.ts` |
| Schema (campaign, messages, character data, combat, state update) | `shared/schema.ts` |
| TTS chain | `client/src/lib/tts.ts` + `server/routes.ts` `/api/tts` |
| Voice prefs | `client/src/lib/preferences.ts` |

---

## Conventions / things not to do

- **Don't add `localStorage` / `sessionStorage`** — the app is designed to embed in iframes that block it. Use the in-memory `Prefs` singleton or React state.
- **Don't break hash routing** — Wouter is configured with `useHashLocation` so the app works under iframes/file:// previews. Anything that hard-redirects without `#/` will lose the route.
- **Don't roll dice for the player** — the system prompt and UI are explicit: the player rolls physical dice and types the result. Keep it that way.
- **Branch is `master`, not `main`.** Pushes go to `origin master`.
- **Don't commit `.env`, `*.db`, `dist/`, `node_modules/`** — already gitignored.
- **The build's esbuild step bundles via `script/build.ts`** — don't `tsx server/index.ts` in production, it'll hit `__dirname` issues in `server/static.ts`.
