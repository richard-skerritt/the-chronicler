# 🎲 The Chronicler — AI Tabletop Game Master

> *"Roll your dice. Narrate your actions. Let the story come alive."*

**The Chronicler** is an AI-powered Dungeon Master for tabletop RPG adventures. You play with your physical dice and game pieces — The Chronicler handles the storytelling, NPCs, combat rules, and dramatic narration in a deep theatrical voice.

This started as a side project to learn AI development whilst looking after kids at home. It's genuinely fun to play, and I'm proud of how far it's come. Still very much a work in progress!

---

## What it does

- 🎭 **Full AI Dungeon Master** — powered by Claude (Anthropic), streaming responses in real time
- 🔊 **Theatrical narration** — ElevenLabs TTS with a custom-designed British narrator voice
- 🧙 **D&D Character Creation** — proper 5e character creation wizard (race, class, ability scores, background)
- 🏰 **Heroes of the Borderlands** — built around the official D&D 2025 Starter Set campaign
- ✨ **Immersive visuals** — floating ember particles, parallax dungeon stone background, fire glow effects
- 📖 **Adventurer's Guide** — built-in tutorial for people who've never played D&D before
- 💾 **Session persistence** — SQLite database keeps your campaign going between sessions

---

## Tech stack

| Layer | What I used |
|-------|-------------|
| Frontend | React + TypeScript + Tailwind CSS v3 + shadcn/ui |
| Backend | Node.js + Express |
| AI / DM brain | Claude Sonnet (Anthropic) via streaming SSE |
| Voice narration | ElevenLabs TTS v3 |
| Database | SQLite + Drizzle ORM |
| Routing | Wouter (hash-based, works in iframes) |
| Build tool | Vite |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/skerrittrichard-hash/the-chronicler.git
cd the-chronicler
npm install
```

### 2. Set up your environment

Copy the example env file:

```bash
cp .env.example .env
```

Then fill in your keys:

```
VITE_ELEVENLABS_API_KEY=your_key_here     # Free at elevenlabs.io
VITE_ELEVENLABS_VOICE_ID=george           # Or your custom voice ID
```

The app uses Anthropic's Claude for the AI. You'll need an API key from [console.anthropic.com](https://console.anthropic.com) set as `ANTHROPIC_API_KEY` in your environment.

### 3. Run it

```bash
npm run dev
```

Opens at `http://localhost:5000`. That's it.

---

## How to play

1. Click **Begin Adventure** to create your D&D character (or use the default party)
2. Place your physical dice and game tokens on your table
3. Type what your character does — The Chronicler responds with narration
4. When the DM asks you to roll, pick up your physical dice and type the result back
5. Check the **? Help** tab on the right panel if you're new to D&D — it explains everything

---

## Project structure

```
the-chronicler/
├── client/              # React frontend
│   └── src/
│       ├── pages/       # LandingPage, GamePage, CharacterCreatePage, SettingsPage
│       ├── components/  # CharacterPanel, CombatTracker, DiceGuide, etc.
│       └── lib/         # tts.ts, preferences.ts, queryClient.ts
├── server/              # Express backend
│   ├── routes.ts        # API routes (/api/chat, /api/tts, /api/campaign)
│   ├── systemPrompt.ts  # The DM's personality and rules
│   └── db.ts            # Database setup
└── shared/
    └── schema.ts        # Shared TypeScript types
```

---

## What's next

This is a work in progress. Things I want to add:

- [ ] Proper combat initiative tracker with animated turn order
- [ ] Sound effects (doors, combat, ambience) layered under narration
- [ ] Multiple campaign support / campaign picker
- [ ] Save/load named sessions
- [ ] PWA support (installable as a desktop app)
- [ ] Electron packaging (proper downloadable app)
- [ ] Support for custom campaign uploads

---

## A note on API keys

The app needs ElevenLabs for voice narration — their free tier gives 10,000 characters/month, which is enough to try it out. The Starter plan (£4/month) gives 30,000, which is comfortable for regular play.

For the AI brain, Anthropic's Claude is used. You'll need your own API key — pay-as-you-go, a typical session costs fractions of a penny.

Neither key is included in this repo (they're in `.env` which is gitignored). Check `.env.example` for the format.

---

## Built by

Richard Skerritt — Cybersecurity professional learning AI development one project at a time.

[LinkedIn](https://linkedin.com/in/richard-skerritt-25558254) · [GitHub](https://github.com/skerrittrichard-hash)

---

*If you try it, let me know what you think. Pull requests and issues welcome — this thing is very much alive and changing.*
