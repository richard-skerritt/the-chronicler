# The Chronicler — AI-Powered Tabletop Game Master

> *Your AI Game Master for tabletop adventures*

The Chronicler is a full-stack web application that acts as an intelligent, atmospheric Dungeon Master for the **Heroes of the Borderlands** campaign (D&D 5e 2025 Starter Set). Players use physical board pieces and dice — The Chronicler handles everything the DM would do: narration, rulings, NPC roleplay, combat adjudication, and dramatic storytelling.

Built as a GitHub portfolio showcase demonstrating production-ready AI integration, streaming LLM responses, real-time text-to-speech, and a polished dark fantasy UI.

---

## Features

### AI Dungeon Master
- **Streaming narration** via Claude Sonnet 4.6 (Anthropic) — responses appear word-by-word for maximum immersion
- Deep system prompt trained on the full Heroes of the Borderlands campaign: all 11 caves, room-by-room encounters, enemy stats, NPC motivations, and DM style guidelines
- Maintains campaign state across sessions (HP, gold, spell slots, location, combat)
- Understands 5e rules: advantage/disadvantage, spell slots, sneak attack, saving throws

### Text-to-Speech
- **Browser TTS** (primary) — zero latency, works everywhere, deep narrator voice
- **ElevenLabs TTS v3** (enhanced quality) — rich AI voice via API
- Configurable rate, pitch, and voice selection
- Auto-speaks each DM response after delivery; stop/skip controls in toolbar

### Character Tracking
- Live HP bars for Gideon Quick-Finger (Halfling Rogue) and Zella Slut-Thorne (Human Wizard)
- Spell slot pip indicators (auto-updated by the AI)
- Gold tracking with amber styling
- Initiative modifiers always visible

### Combat Tracker
- One-click combat mode activation
- Add/remove combatants with HP and initiative values
- Enemy HP bar tracking during encounters
- Quick reference: attack bonuses, spell DC, sneak attack dice

### Cave Progress
- 11-cave visual progress tracker (A through K)
- Cave A unlocked at start; caves unlock as party progresses
- Tracks cleared status and gold earned
- Cave K (Ivlis's lair) marked with skull indicator

### Dice Helper
- Full dice set: d4, d6, d8, d10, d12, d20, d100
- Modifier selector: -5 through +5
- Advantage/Disadvantage d20 rolls
- Results displayed inline for quick reference

### Settings & Session Management
- Manual state overrides — sync app state if it drifts from physical game
- New Session button — restore HP/spell slots for a fresh play session
- Persistent SQLite database survives server restarts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Routing | Wouter (hash-based, iframe-safe) |
| State | TanStack Query v5 |
| Backend | Express.js (Node) |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI | Anthropic Claude Sonnet 4.6 (streaming SSE) |
| TTS | Web Speech API + ElevenLabs TTS v3 |
| Fonts | Cinzel (display) + Lora (body) via Google Fonts |

---

## Getting Started

### Prerequisites
- Node.js 18+
- An **Anthropic API key** (for the AI DM)
- Optionally an **ElevenLabs API key** (for enhanced TTS voice)

### Installation

```bash
git clone https://github.com/your-username/the-chronicler.git
cd the-chronicler
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...   # Optional — browser TTS works without this
```

### Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:5000`

### Build for Production

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

---

## Architecture

```
the-chronicler/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── GamePage.tsx        # Main game interface
│   │   │   └── SettingsPage.tsx    # Campaign state management
│   │   ├── components/
│   │   │   ├── CharacterPanel.tsx  # HP/gold/spell slot display
│   │   │   ├── CaveProgress.tsx    # 11-cave progress tracker
│   │   │   ├── CombatTracker.tsx   # Combat mode with initiative
│   │   │   ├── DiceHelper.tsx      # Dice roller utility
│   │   │   ├── ChroniclerLogo.tsx  # Custom SVG scroll+quill logo
│   │   │   └── ThemeProvider.tsx   # Dark/light theme toggle
│   │   └── lib/
│   │       └── tts.ts              # TTS manager (browser + ElevenLabs)
│   └── index.html                  # Cinzel + Lora font loading
├── server/
│   ├── routes.ts                   # API routes (chat SSE, TTS, campaign)
│   ├── storage.ts                  # SQLite CRUD via Drizzle
│   ├── db.ts                       # Database setup
│   ├── systemPrompt.ts             # Campaign-trained AI system prompt
│   └── tts_helper.py               # ElevenLabs TTS subprocess helper
└── shared/
    └── schema.ts                   # Drizzle schema (campaigns + messages)
```

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/campaign` | Fetch current campaign state |
| `PATCH` | `/api/campaign/:id` | Update campaign state |
| `POST` | `/api/campaign/reset` | Start new session (restore HP/slots) |
| `GET` | `/api/messages/:campaignId` | Fetch chat history |
| `POST` | `/api/chat` | Send player action → SSE DM response stream |
| `POST` | `/api/tts` | Generate TTS audio (ElevenLabs) |

### SSE Streaming Chat

The `/api/chat` endpoint streams the AI response as Server-Sent Events, displaying narration word-by-word for immersion. The response is simultaneously committed to the database after completion.

---

## The Campaign

**Heroes of the Borderlands** (D&D 5e 2025 Starter Set)

- **Gideon Quick-Finger** — Halfling Rogue (9 HP, AC 13, +3 to hit, Sneak Attack 1d6)
- **Zella Slut-Thorne** — Human Wizard (7 HP, AC 12, 2 spell slots, Spell DC 13)
- **Current location:** The Caves of Chaos — 11 connected cave systems
- **Final boss:** Ivlis, cult leader (Cave K)

The app acts purely as DM — players roll real dice and report results. The AI adjudicates outcomes based on D&D 5e rules.

---

## Design System

Dark torch-lit atmosphere:

```css
Background:     hsl(30, 12%, 6%)    /* Deep stone */
Primary accent: hsl(38, 68%, 55%)   /* Warm amber/gold */
Danger:         hsl(0, 62%, 45%)    /* Crimson */
```

Typography:
- **Cinzel** — headers, DM narration titles, UI labels (medieval serif)
- **Lora** — body text, chat messages (readable book serif)

---

## Commercial Potential

The Chronicler is designed with a commercial tier structure in mind:

| Tier | Features |
|---|---|
| **Free** | Browser TTS, 3 campaigns, Claude Haiku DM |
| **Pro ($9/mo)** | ElevenLabs voice, unlimited campaigns, Claude Sonnet DM, campaign export |
| **Campaign Pack** | Additional campaign modules (Lost Mine of Phandelver, etc.) |

---

## License

MIT — fork freely, build your own campaigns.

---

*Built with Claude Sonnet 4.6 · Anthropic API · ElevenLabs TTS v3*
