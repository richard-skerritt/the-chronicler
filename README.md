# 🐉 The Chronicler — AI Tabletop Game Master

> *"Roll your dice. Narrate your actions. Let the story come alive."*

**The Chronicler** is an AI-powered Dungeon Master for tabletop RPG adventures. You play with your physical dice and game pieces — The Chronicler handles the storytelling, NPCs, combat rules, and dramatic narration in a deep theatrical voice.

This started as a side project to learn AI development whilst looking after kids at home. It's genuinely fun to play, and I'm proud of how far it's come. Still very much a work in progress!

---

## What it does

- 🎭 **Full AI Dungeon Master** — powered by Claude (Anthropic), streaming responses in real time
- 🔊 **Theatrical narration** — ElevenLabs TTS with a custom-designed British narrator voice
- 🧙 **D&D Character Creation** — proper 5e character creation wizard (race, class, ability scores, background)
- 🏰 **Heroes of the Borderlands** — built around the official D&D 2025 Starter Set campaign
- 📖 **Adventurer's Guide** — built-in tutorial for people who've never played D&D before
- 💾 **Session persistence** — SQLite database keeps your campaign going between sessions

---

## The look & feel

The Chronicler is meant to feel like an **illuminated manuscript pulled into a flickering torch-lit hall** — heavy, atmospheric, theatrical. The latest visual overhaul moves the whole app away from generic dark-mode stone and into proper dark fantasy territory.

### Dragon battle backdrop

Every page sits over a fixed full-bleed image of a **crimson dragon mid-battle** (`client/public/crimson_dragon_battle.png`), painted into `body { background-image }` in `client/src/index.css`. It's `background-attachment: fixed` so it stays put while the chat scrolls, and is veiled behind a dark semi-transparent overlay (`.page-overlay`) so text stays readable.

### Dark fantasy colour scheme

The palette is built around a handful of tokens, expressed as HSL CSS variables in `client/src/index.css`:

| Token | Where it shows |
|-------|----------------|
| **Deep midnight purple** (`246 28% 5%`) | Page surfaces, panel backgrounds |
| **Ember fire** (`18 90% 52%`) | Primary accent — buttons, glows, narration emphasis |
| **Aged gold** (`42 88% 56%`) | Borders, secondary accents, "save" actions |
| **Deep forest** (`148 30% 11%`) | Secondary surfaces, calm UI elements |
| **Blood crimson** (`0 72% 45%`) | Destructive / danger — combat, low HP |
| **Parchment / vellum / ink** | Reserved for the manuscript and scroll surfaces |

### Cinzel + Cinzel Decorative typography

Three fonts, all loaded from Google Fonts in `client/index.html`:

- **Cinzel Decorative** — titles, headings, buttons (`<h1>` through `<h6>`, every `<button>`)
- **Cinzel** — display text, body copy, scroll narration
- **Lora** — long-form `.narration` paragraphs (italic *em* → ember-coloured)

The `.font-display` utility class is wired through everywhere a heading or call-to-action lives.

### Animated parchment scroll for DM narration

DM responses now render as a **burned parchment scroll** that unrolls top-to-bottom on arrival (one-shot, ~1 second cubic-bezier ease, then a 600ms text fade-in). It lives in `client/src/components/ScrollDisplay.tsx` and exports three pieces:

- `ParchmentScroll` — single message, with the unroll animation, ember spots and bottom fire glow
- `PlayerTablet` — a dark stone plaque for the player's own actions
- `ScrollChat` — the full chat-area renderer used by `GamePage`

The scroll has a hand-built SVG bezier mask (`TORN_MASK`) for the organic torn shape, an aged-parchment gradient (charred edges → warm centre → charred edges), and two burn overlays — charcoal at the top, flame-amber at the bottom.

### Character race images replacing emojis

The character creation wizard's race step now shows **proper portrait artwork** instead of emoji glyphs. Eight race illustrations live in `client/public/`:

- `race-human.png`
- `race-elf.png`
- `race-dwarf.png`
- `race-halfling.png`
- `race-halforc.png`
- `race-tiefling.png`
- `race-gnome.png`
- `race-dragonborn.png`

They're mapped onto the race cards in `client/src/pages/CharacterCreatePage.tsx`.

### Work in progress — burned/torn scroll edges

The torn-edge mask is implemented with cubic bezier curves to look hand-burned, but it's **not done yet**. Specifically:

- The edge silhouette is too uniform — needs more irregular, fire-eaten variation
- Ember spots are static positions; **animation along the edges is still to come** (they should drift / pulse along the burn line, not just blink in place)
- The charcoal gradient at the top reads as a hard band rather than a soft progressive char

This is the next visual polish pass. The structure is in `ScrollDisplay.tsx` — `_TORN_PATH`, `EMBER_SPOTS`, and the two burn-overlay divs are the bits to iterate on.

---

## Tech