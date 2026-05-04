import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, API_BASE } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';
import type { Campaign, Message } from '@shared/schema';
import { speakText, stopSpeech, isSpeaking, touchAudioContext, hasPendingAudio } from '@/lib/tts';
import { Prefs } from '@/lib/preferences';
import { useTheme } from '@/components/ThemeProvider';
import CharacterPanel from '@/components/CharacterPanel';
import CaveProgress from '@/components/CaveProgress';
import CombatTracker from '@/components/CombatTracker';
import DiceHelper from '@/components/DiceHelper';
import DiceGuide from '@/components/DiceGuide';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Send, Volume2, VolumeX, Settings, RotateCcw, Sword, BookOpen, Moon, Sun, Mic, MicOff, Scroll, HelpCircle
} from 'lucide-react';

// ── Parallax hook ────────────────────────────────────────────────────────────
// Drives two background layers at different depths via direct DOM style writes.
// No React state = zero re-renders on mouse move.
function useParallaxBackground(
  stoneRef: React.RefObject<HTMLDivElement>,
  glowRef:  React.RefObject<HTMLDivElement>
) {
  useEffect(() => {
    let raf = 0;
    // Target positions (lerp towards these)
    let tx = 0, ty = 0;
    // Current interpolated positions
    let cx = 0, cy = 0;

    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth  - 0.5);
      ty = (e.clientY / window.innerHeight - 0.5);
    };

    const animate = () => {
      // Lerp for buttery smoothness
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;

      if (stoneRef.current) {
        stoneRef.current.style.transform =
          `translate(${cx * 38}px, ${cy * 26}px)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform =
          `translate(${cx * 62}px, ${cy * 44}px)`;
      }
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [stoneRef, glowRef]);
}

// ── Demo Mode Scripts ────────────────────────────────────────────────────────
const DEMO_STEPS = [
  {
    player: '',  // No player message for opening
    dm: `# THE CAVES OF CHAOS

*The morning mist clings low to the ravine floor as your party stands before Cave A — the Kobold Lair. The limestone entrance yawns like a wound in the rock face, carved dark with old smoke and older stains.*

*Inside: the skittering sound of something small, quick, and very much awake.*

Gideon tilts his head toward the opening. One hand finds his shortsword without thinking. "Smells like wet dog and bad decisions," he mutters.

Zella doesn't argue. Her staff tip glows faintly. She's already calculating.

---

**Two things are immediately apparent:**

**First** — the moment you step past that oval mouth, you will be in complete darkness. The cave swallows natural light within a few feet. You'll need Zella's *Light* cantrip, or another solution.

**Second** — whatever lives here is active. Not sleeping. Not hiding. Going about its business, entirely unaware of you.

*That could be an advantage. Or a warning.*

What do Gideon and Zella do?`,
  },
  {
    player: 'Gideon scouts ahead quietly into the dark. I rolled a 14 on Stealth.',
    dm: `*A 14 is more than enough. Gideon slips into the darkness like smoke — his Halfling feet barely whisper on the stone.*

Twelve feet in, crouched behind a stalagmite, he spots them:

**Three kobolds** gathered around a crude fire pit. Copper-scaled, armed with bone-handled daggers and short spears. The lead one — the biggest, which isn't saying much — is gnawing on something that used to be a rat.

They haven't spotted him.

---

**⚔️ Sneak Attack available** — Gideon has full surprise advantage on the first round.

*The lead kobold is 8 feet away. The other two flank the fire at 15 and 20 feet. Gideon has one clean window before the one on the right turns around.*

Does he signal Zella, or strike alone?`,
  },
  {
    player: 'Gideon attacks the lead kobold! I rolled 17 to hit, 5 damage plus 4 Sneak Attack — 9 total.',
    dm: `*17 hits — kobold AC is 12. 9 damage drops the creature instantly.*

**⚔️ COMBAT — Round 1**

Gideon erupts from shadow. The lead kobold has time to register surprise — that's all — before the shortsword finds the gap in its scales. It crumples with a wet cough, spear clattering on stone.

The other two spin. Slings come up. Eyes go wide with something between fury and terror.

---

**Initiative order:**
- 🗡️ Gideon: **18** *(acts first)*
- ✨ Zella: **12**
- Kobold B: 9
- Kobold C: 6

**Zella's turn** — she has two options before the kobolds act:
- 💜 ***Sleep*** (spell slot) — potentially ends the fight instantly
- 🔥 ***Fire Bolt*** (cantrip) — 1d10 damage, no slot spent

What does Zella do?`,
  },
  {
    player: 'Zella casts Sleep! I rolled a 9 on the hit point total.',
    dm: `*9 hit points of creatures fall into magical slumber.*

Both remaining kobolds drop. Face-first. Snoring.

The cave goes quiet — just the crackle of the fire and the sound of two kobolds sawing logs on the stone floor.

Gideon stares at them. Then at Zella.

*"That's actually terrifying,"* he says.

---

**Zella:** HP 7/7 · Spell Slots: **1/2** remaining

**💰 Searching the bodies:**
- **7 gold pieces** — split between tattered belt pouches
- **A crude hide map** — shows two tunnels branching deeper into Cave A. Claw marks indicate something larger beyond the eastern passage.

The fire crackles. The eastern tunnel breathes cold air that smells of iron and something animal.

*The Caves of Chaos go deeper. You've only just begun.*

---

*— End of demo — Start your own adventure to continue the story.*`,
  },
];

// Render DM response with formatting.
// onParchment=true → dark ink colours for manuscript background
// onParchment=false (default) → warm light colours for dark background
function renderContent(text: string, onParchment = false): React.ReactNode {
  const parts = text.split('\n');
  return parts.map((line, i) => {
    if (!line.trim()) return <br key={i} />;

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      return (
        <hr key={i} className="border-0 my-3"
          style={{ borderTop: `1px solid ${onParchment ? 'hsl(34 22% 58% / 0.5)' : 'hsl(42 30% 28% / 0.4)'}` }}
        />
      );
    }

    if (line.startsWith('# ')) {
      return (
        <h3 key={i}
          className="font-display text-base tracking-wider uppercase mt-3 mb-1"
          style={{ color: onParchment ? 'hsl(30 35% 22%)' : 'hsl(42 88% 62%)' }}
        >
          {line.slice(2)}
        </h3>
      );
    }

    if (line.startsWith('## ')) {
      return (
        <h4 key={i}
          className="font-display text-sm tracking-wider uppercase mt-2 mb-1"
          style={{ color: onParchment ? 'hsl(30 28% 28%)' : 'hsl(42 70% 55% / 0.85)' }}
        >
          {line.slice(3)}
        </h4>
      );
    }

    const formatted = line
      .split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|⚔️.*|💰.*|✨.*|📍.*)/g)
      .map((chunk, j) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return <strong key={j}>{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2) {
          return (
            <em key={j}
              className="italic"
              style={{ color: onParchment ? 'hsl(14 80% 38%)' : 'hsl(26 90% 65%)' }}
            >
              {chunk.slice(1, -1)}
            </em>
          );
        }
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
          return (
            <code key={j}
              className="px-1 rounded text-sm"
              style={{
                color: onParchment ? 'hsl(260 40% 35%)' : 'hsl(265 52% 75%)',
                background: onParchment ? 'hsl(260 20% 78% / 0.5)' : 'hsl(265 40% 18% / 0.5)',
              }}
            >
              {chunk.slice(1, -1)}
            </code>
          );
        }
        if (/^[⚔️💰✨📍🎲🛡️❤️]/.test(chunk)) {
          return (
            <span key={j}
              className="font-display text-xs"
              style={{ color: onParchment ? 'hsl(32 55% 30% / 0.85)' : 'hsl(42 80% 60% / 0.85)' }}
            >
              {chunk}
            </span>
          );
        }
        return chunk;
      });

    if (/^[⚔️💰✨📍🎲]/.test(line)) {
      return (
        <p key={i}
          className="text-xs font-display pt-1 mt-1"
          style={{
            color: onParchment ? 'hsl(32 50% 32% / 0.75)' : 'hsl(42 70% 55% / 0.75)',
            borderTop: `1px solid ${onParchment ? 'hsl(34 22% 60%)' : 'hsl(248 22% 20%)'}`,
          }}
        >
          {formatted}
        </p>
      );
    }

    return <p key={i} className="mb-2 last:mb-0 leading-relaxed">{formatted}</p>;
  });
}

export default function GamePage() {
  const qc = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [rightPanel, setRightPanel] = useState<'combat' | 'dice' | 'caves' | 'guide'>('caves');
  const abortRef = useRef<AbortController | null>(null);

  // Parallax background refs
  const parallaxStoneRef = useRef<HTMLDivElement>(null);
  const parallaxGlowRef  = useRef<HTMLDivElement>(null);
  useParallaxBackground(parallaxStoneRef, parallaxGlowRef);

  // Pending audio indicator — polls hasPendingAudio() so user can tap to unlock
  const [pendingAudio, setPendingAudio] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPendingAudio(hasPendingAudio()), 400);
    return () => clearInterval(id);
  }, []);

  // Demo mode
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoMessages, setDemoMessages] = useState<Array<{role: 'player'|'dm', content: string}>>([]);
  const demoRunning = useRef(false);

  // Campaign state
  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ['/api/campaign'],
    refetchInterval: false,
  });

  // Messages
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['/api/messages', campaign?.id],
    enabled: !!campaign?.id,
  });

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Auto-start demo when navigated to /demo route
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/demo' && !isDemoMode && messages.length === 0 && !campaignLoading) {
      startDemo();
    }
  }, [campaignLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-speak last DM message when it arrives
  const speakDMMessage = useCallback(async (text: string) => {
    if (!ttsEnabled) return;
    const p = Prefs.voice;
    setTtsActive(true);
    await speakText(text, {
      voice: 'elevenlabs',
      voiceName: p.voiceName,
      elevenLabsApiKey: p.elevenLabsApiKey,
      rate: 0.9,
      pitch: 0.8,
      onEnd: () => setTtsActive(false),
      onError: () => setTtsActive(false),
    });
  }, [ttsEnabled]);

  // Demo mode: stream a pre-scripted DM response
  const runDemoStep = useCallback(async (step: number) => {
    if (!demoRunning.current) return;
    const exchange = DEMO_STEPS[step];
    if (!exchange) return;

    // Show player action (if any) instantly
    if (exchange.player) {
      setDemoMessages(prev => [...prev, { role: 'player', content: exchange.player }]);
    }

    // Stream DM response word-by-word
    setIsStreaming(true);
    setStreamingText('');
    const words = exchange.dm.split(/( )/);  // split but keep spaces
    let acc = '';
    for (const word of words) {
      if (!demoRunning.current) break;
      acc += word;
      setStreamingText(acc);
      await new Promise(r => setTimeout(r, word.trim() ? 18 : 5));
    }
    setStreamingText('');
    setIsStreaming(false);
    if (!demoRunning.current) return;
    setDemoMessages(prev => [...prev, { role: 'dm', content: exchange.dm }]);
    setDemoStep(step + 1);

    // Narrate
    if (ttsEnabled) {
      const p = Prefs.voice;
      setTtsActive(true);
      speakText(exchange.dm, {
        voice: 'elevenlabs',
        voiceName: p.voiceName,
        elevenLabsApiKey: p.elevenLabsApiKey,
        rate: 0.9,
        pitch: 0.8,
        onEnd: () => setTtsActive(false),
        onError: () => setTtsActive(false),
      });
    }
  }, [ttsEnabled]);

  const startDemo = useCallback(() => {
    demoRunning.current = true;
    setIsDemoMode(true);
    setDemoStep(0);
    setDemoMessages([]);
    setStreamingText('');
    runDemoStep(0);
  }, [runDemoStep]);

  const advanceDemo = useCallback(() => {
    if (demoStep < DEMO_STEPS.length) {
      runDemoStep(demoStep);
    } else {
      demoRunning.current = false;
      setIsDemoMode(false);
      setDemoMessages([]);
      setDemoStep(0);
    }
  }, [demoStep, runDemoStep]);

  const exitDemo = useCallback(() => {
    demoRunning.current = false;
    stopSpeech();
    setIsDemoMode(false);
    setDemoMessages([]);
    setDemoStep(0);
    setStreamingText('');
    setIsStreaming(false);
    setTtsActive(false);
  }, []);

  // Send player message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !campaign) return;

    const playerMessage = input.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: playerMessage, campaignId: campaign.id }),
        signal: abortRef.current.signal,
      });

      if (!response.body) throw new Error('No stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              fullText += data.content;
              setStreamingText(fullText);
            } else if (data.type === 'done') {
              setStreamingText('');
              setIsStreaming(false);
              // Refresh campaign state and messages
              qc.invalidateQueries({ queryKey: ['/api/campaign'] });
              qc.invalidateQueries({ queryKey: ['/api/messages', campaign.id] });
              // Speak the response
              speakDMMessage(fullText);
            }
          } catch {
            // ignore parse errors on incomplete chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Send failed:', err);
        setStreamingText('*The Chronicler hesitates, quill poised... Please try again.*');
        setTimeout(() => setStreamingText(''), 3000);
      }
      setIsStreaming(false);
    }
  }, [input, isStreaming, campaign, qc, speakDMMessage]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      touchAudioContext(); // unlock audio on keypress
      sendMessage();
    }
  };

  // Reset session
  const [, navigate] = useLocation();

  const resetMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/campaign/reset'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/campaign'] });
      qc.invalidateQueries({ queryKey: ['/api/messages', campaign?.id] });
    },
  });

  const newGameMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/campaign/new-game'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/campaign'] });
      navigate('/create');
    },
  });

  const toggleTTS = () => {
    if (ttsActive) {
      stopSpeech();
      setTtsActive(false);
    } else {
      setTtsEnabled(e => !e);
    }
  };

  // Speak a specific message on demand
  const speakMessage = (text: string) => {
    if (ttsActive) {
      stopSpeech();
      setTtsActive(false);
    } else {
      speakDMMessage(text);
    }
  };

  if (campaignLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center stone-texture">
        <div className="text-center space-y-4">
          <ChroniclerLogo className="w-16 h-16 mx-auto logo-glow torch-flicker" />
          <p className="font-display text-amber-400 tracking-widest text-sm animate-pulse">OPENING THE TOME...</p>
        </div>
      </div>
    );
  }

  const inCombat = campaign?.inCombat ?? false;

  return (
    <div className="min-h-screen bg-background flex flex-col stone-texture relative overflow-hidden">

      {/* ── Parallax layer 1: stone noise texture ── */}
      <div
        ref={parallaxStoneRef}
        aria-hidden="true"
        className="parallax-stone-layer"
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="pg-stone">
            <feTurbulence type="fractalNoise" baseFrequency="0.68 0.58" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#pg-stone)" />
        </svg>
      </div>

      {/* ── Parallax layer 2: ambient glow gradients ── */}
      <div
        ref={parallaxGlowRef}
        aria-hidden="true"
        className="parallax-glow-layer"
      />

      {/* ── Floating ember atmosphere ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ zIndex: 1 }}>
        {[
          // Regular embers — orange/red
          { l:'4%',  w:5, dur:'7s',   delay:'0s',    drift:'22px',  drift2:'-16px', spark:false },
          { l:'11%', w:3, dur:'9s',   delay:'1.4s',  drift:'-18px', drift2:'10px',  spark:false },
          { l:'19%', w:6, dur:'6s',   delay:'2.8s',  drift:'28px',  drift2:'-22px', spark:false },
          { l:'27%', w:4, dur:'11s',  delay:'0.6s',  drift:'-14px', drift2:'18px',  spark:false },
          { l:'34%', w:5, dur:'8s',   delay:'3.5s',  drift:'20px',  drift2:'-10px', spark:false },
          { l:'42%', w:3, dur:'7.5s', delay:'1.9s',  drift:'-24px', drift2:'14px',  spark:false },
          { l:'50%', w:6, dur:'10s',  delay:'0.3s',  drift:'16px',  drift2:'-20px', spark:false },
          { l:'58%', w:4, dur:'6.5s', delay:'2.2s',  drift:'-10px', drift2:'24px',  spark:false },
          { l:'67%', w:5, dur:'9.5s', delay:'4.1s',  drift:'30px',  drift2:'-12px', spark:false },
          { l:'75%', w:3, dur:'8.5s', delay:'5.0s',  drift:'-20px', drift2:'16px',  spark:false },
          { l:'82%', w:6, dur:'12s',  delay:'1.0s',  drift:'14px',  drift2:'-28px', spark:false },
          { l:'89%', w:4, dur:'7s',   delay:'3.0s',  drift:'-22px', drift2:'10px',  spark:false },
          { l:'95%', w:5, dur:'9s',   delay:'0.8s',  drift:'18px',  drift2:'-14px', spark:false },
          { l:'14%', w:3, dur:'8s',   delay:'6.0s',  drift:'-16px', drift2:'20px',  spark:false },
          { l:'38%', w:4, dur:'11s',  delay:'2.5s',  drift:'24px',  drift2:'-18px', spark:false },
          // Hot sparks — bright yellow-white, faster
          { l:'7%',  w:3, dur:'4.5s', delay:'1.2s',  drift:'12px',  drift2:'-8px',  spark:true  },
          { l:'31%', w:2, dur:'3.8s', delay:'0.5s',  drift:'-10px', drift2:'12px',  spark:true  },
          { l:'55%', w:3, dur:'5.0s', delay:'2.0s',  drift:'16px',  drift2:'-10px', spark:true  },
          { l:'72%', w:2, dur:'4.2s', delay:'3.8s',  drift:'-14px', drift2:'8px',   spark:true  },
          { l:'88%', w:3, dur:'4.8s', delay:'1.6s',  drift:'10px',  drift2:'-16px', spark:true  },
        ].map((p, i) => (
          <span
            key={i}
            className={`ember-particle${p.spark ? ' spark' : ''}`}
            style={{
              width: p.w, height: p.w, left: p.l,
              bottom: p.spark ? `${(i * 4) % 6}%` : `${(i * 2) % 5}%`,
              '--dur': p.dur, '--delay': p.delay, '--drift': p.drift, '--drift2': p.drift2,
            } as React.CSSProperties}
          />
        ))}
      </div>
      {/* ── Top Header ── */}
      <header className="header-ornate bg-card sticky top-0" style={{ zIndex: 50 }}>
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <ChroniclerLogo
              className="w-8 h-8 logo-glow torch-flicker"
              style={{ color: 'hsl(42 88% 64%)' }}
            />
            <div>
              <h1
                className="font-display text-base leading-none tracking-widest"
                style={{
                  color: 'hsl(44 85% 72%)',
                  textShadow: '0 0 14px hsl(42 88% 56% / 0.55)',
                }}
              >
                THE CHRONICLER
              </h1>
              <p className="font-display text-xs tracking-[0.2em]" style={{ color: 'hsl(42 30% 42%)' }}>
                HEROES OF THE BORDERLANDS
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* TTS toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                touchAudioContext(); // unlock + replay pending
                if (ttsActive) { stopSpeech(); setTtsActive(false); }
                else setTtsEnabled(e => !e);
              }}
              className={`h-8 w-8 ${ttsActive ? 'tts-active text-amber-400' : ttsEnabled ? 'text-amber-400' : 'text-muted-foreground'}`}
              title={ttsActive ? 'Stop speaking' : ttsEnabled ? 'Voice ON (click to mute)' : 'Voice OFF (click to enable)'}
              data-testid="button-tts-toggle"
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Panel toggle: combat / dice / caves / guide */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanel(p => p === 'combat' ? 'caves' : p === 'caves' ? 'dice' : p === 'dice' ? 'guide' : 'combat')}
              className="h-8 w-8 text-muted-foreground hover:text-amber-400"
              title="Toggle right panel"
              data-testid="button-panel-toggle"
            >
              {rightPanel === 'combat' ? <Sword className="h-4 w-4" /> : rightPanel === 'caves' ? <Scroll className="h-4 w-4" /> : rightPanel === 'dice' ? <BookOpen className="h-4 w-4" /> : <HelpCircle className="h-4 w-4 text-amber-400" />}
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-muted-foreground hover:text-amber-400"
              data-testid="button-theme-toggle"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Settings */}
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-400" data-testid="link-settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Character HP strip */}
        {campaign && <CharacterPanel campaign={campaign} />}
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 2 }}>
        {/* Left Sidebar */}
        <aside className="w-48 hidden lg:flex flex-col" style={{ borderRight: '1px solid hsl(var(--gold-dark) / 0.2)', background: 'hsl(248 24% 7% / 0.6)' }}>
          <div className="p-3 space-y-4 flex-1 overflow-y-auto">
            {/* Location */}
            <div>
              <p className="font-display text-xs tracking-widest mb-2 uppercase" style={{ color: 'hsl(var(--gold))' }}>Location</p>
              <p className="text-sm text-foreground leading-snug">{campaign?.currentLocation ?? 'Unknown'}</p>
              {inCombat && (
                <Badge variant="destructive" className="mt-1 text-xs font-display tracking-wide">
                  ⚔️ IN COMBAT
                </Badge>
              )}
            </div>

            <Separator style={{ background: 'hsl(var(--gold-dark) / 0.2)' }} />

            {/* Cave progress mini-view */}
            <div>
              <p className="font-display text-xs tracking-widest mb-2 uppercase" style={{ color: 'hsl(var(--gold))' }}>Progress</p>
              <CaveProgress
                cavesCleared={JSON.parse(campaign?.cavesCleared ?? '[]')}
                partyLevel={campaign?.partyLevel ?? 1}
                compact
              />
            </div>

            <Separator style={{ background: 'hsl(var(--gold-dark) / 0.2)' }} />

            {/* Session actions */}
            <div className="space-y-1">
              <p className="font-display text-xs tracking-widest mb-2 uppercase" style={{ color: 'hsl(var(--gold))' }}>Session</p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground hover:text-orange-400 h-7"
                onClick={() => {
                  if (confirm('Reset HP and spell slots, keep your characters?')) {
                    resetMutation.mutate();
                  }
                }}
                data-testid="button-reset-session"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                New Session
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground hover:text-red-400 h-7"
                onClick={() => {
                  if (confirm('Start a completely new adventure? This clears all progress and returns to character creation.')) {
                    newGameMutation.mutate();
                  }
                }}
                data-testid="button-new-game"
              >
                <Sword className="h-3 w-3 mr-1.5" />
                New Game
              </Button>
            </div>
          </div>

          {/* Party Level */}
          <div className="p-3" style={{ borderTop: '1px solid hsl(var(--gold-dark) / 0.2)' }}>
            <div className="text-center">
              <p className="font-display text-xs tracking-widest" style={{ color: 'hsl(var(--muted-foreground))' }}>PARTY LEVEL</p>
              <p
                className="font-display text-2xl"
                style={{ color: 'hsl(var(--gold))', textShadow: '0 0 12px hsl(var(--gold) / 0.4)' }}
              >
                {campaign?.partyLevel ?? 1}
              </p>
            </div>
          </div>
        </aside>

        {/* ── Center: Chat Feed ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="max-w-2xl mx-auto space-y-4 pb-4">
              {/* Welcome state (no messages, not in demo) */}
              {!isDemoMode && messages.length === 0 && !streamingText && (
                <div className="text-center py-12 space-y-4">
                  <ChroniclerLogo
                    className="w-20 h-20 mx-auto torch-flicker"
                    style={{
                      color: 'hsl(42 88% 64%)',
                      filter: [
                        'drop-shadow(0 0 16px hsl(42 88% 56% / 0.75))',
                        'drop-shadow(0 0 32px hsl(18 90% 52% / 0.4))',
                      ].join(' '),
                    }}
                  />
                  <div className="space-y-2">
                    <h2 className="font-display text-xl tracking-wider" style={{ color: 'hsl(18 80% 58%)' }}>The Chronicle Awaits</h2>
                    <p className="font-serif text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'hsl(38 16% 52%)' }}>
                      {campaign?.gameMode === 'custom' && campaign?.char1
                        ? `Your fellowship is assembled. The darkness stirs. Speak your will into the chronicle.`
                        : 'Set your tokens at the mouth of Cave A. When courage calls — declare your first action, or bid The Chronicler to begin.'}
                    </p>
                  </div>
                  {/* Demo button */}
                  <div>
                    <button
                      onClick={startDemo}
                      className="fire-button inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-display text-sm tracking-wide"
                      data-testid="button-start-demo"
                    >
                      <Scroll className="h-4 w-4" />
                      Witness the Chronicle
                    </button>
                    <p
                      className="font-display text-xs tracking-wide mt-2"
                      style={{ color: 'hsl(42 15% 38%)', letterSpacing: '0.1em' }}
                    >
                      A scripted tale — full narration, no key required
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    {[
                      'Begin the adventure',
                      'We search the entrance for traps',
                      'Zella speaks the words of Light',
                      'We listen at the cave mouth',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        className="font-display text-xs tracking-wide px-3 py-1.5 rounded-full transition-all"
                        style={{
                          border: '1px solid hsl(var(--gold-dark) / 0.3)',
                          color: 'hsl(42 20% 46%)',
                          background: 'hsl(248 22% 9% / 0.6)',
                        }}
                        data-testid={`button-suggestion-${suggestion.substring(0, 10)}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Demo mode messages */}
              {isDemoMode && (
                <>
                  {/* Demo banner */}
                  <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Scroll className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-display text-amber-400 text-xs tracking-wide">DEMO MODE</span>
                      <span className="text-muted-foreground text-xs">— scripted session, no API key needed</span>
                    </div>
                    <button
                      onClick={exitDemo}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-exit-demo"
                    >
                      Exit ×
                    </button>
                  </div>

                  {/* Demo messages */}
                  {demoMessages.map((msg, idx) =>
                    msg.role === 'player' ? (
                      <div key={idx} className="flex justify-end message-enter">
                        <div className="max-w-xs lg:max-w-md">
                          <div className="player-bubble rounded-lg px-4 py-2.5 text-sm font-display tracking-wide" style={{ color: 'hsl(40 22% 70%)' }}>
                            {msg.content}
                          </div>
                          <p className="font-display text-xs tracking-widest text-right mt-1" style={{ color: 'hsl(42 18% 34%)' }}>— THE ADVENTURER</p>
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="flex items-start gap-3 message-enter">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            background: 'linear-gradient(160deg, hsl(38 55% 28%), hsl(36 48% 20%))',
                            border: '1px solid hsl(var(--gold-dark) / 0.6)',
                            boxShadow: '0 0 8px hsl(var(--gold) / 0.2)',
                          }}
                        >
                          <Scroll className="h-3.5 w-3.5" style={{ color: 'hsl(var(--gold))' }} />
                        </div>
                        <div className="flex-1 manuscript-entry rounded-lg p-4 pl-6 dm-content relative">
                          <div className="manuscript-prose">
                            {renderContent(msg.content, true)}
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Advance / End Demo button */}
                  {!isStreaming && !ttsActive && demoMessages.length > 0 && (
                    <div className="text-center pt-2">
                      {demoStep < DEMO_STEPS.length ? (
                        <button
                          onClick={advanceDemo}
                          className="ornate-button inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-display text-sm tracking-wide"
                          data-testid="button-demo-next"
                        >
                          Continue the Tale →
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>The scripted chronicle is complete.</p>
                          <button
                            onClick={exitDemo}
                            className="ornate-button inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-display text-sm tracking-wide"
                            data-testid="button-demo-start-adventure"
                          >
                            <Scroll className="h-4 w-4" />
                            Begin Your Own Adventure
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Real message history (hidden during demo) */}
              {!isDemoMode && messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onSpeak={speakMessage}
                  ttsActive={ttsActive}
                />
              ))}

              {/* Streaming response */}
              {streamingText && (
                <div className="message-enter">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: 'linear-gradient(160deg, hsl(38 55% 28%), hsl(36 48% 20%))',
                        border: '1px solid hsl(var(--gold-dark) / 0.6)',
                        boxShadow: '0 0 8px hsl(var(--gold) / 0.2)',
                      }}
                    >
                      <Scroll className="h-3.5 w-3.5" style={{ color: 'hsl(var(--gold))' }} />
                    </div>
                    <div className="flex-1 manuscript-entry rounded-lg p-4 pl-6 dm-content relative">
                      <div className="manuscript-prose">
                        {renderContent(streamingText, true)}
                        <span
                          className="inline-block w-0.5 h-4 animate-pulse ml-0.5 rounded-full"
                          style={{ background: 'hsl(var(--fire))' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* ── Input Bar ── */}
          <div className="p-3 bg-card" style={{ borderTop: '1px solid hsl(var(--gold-dark) / 0.25)', boxShadow: '0 -1px 0 hsl(var(--gold) / 0.06)' }}>
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Speak your action into the chronicle... (Enter to send)"
                    className="chronicle-input resize-none text-sm min-h-[44px] max-h-32 pr-2 font-body rounded-md"
                    rows={1}
                    disabled={isStreaming}
                    data-testid="input-player-action"
                  />
                </div>
                <button
                  onClick={() => { touchAudioContext(); sendMessage(); }}
                  disabled={!input.trim() || isStreaming}
                  className="ornate-button h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-md"
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {/* Pending audio nudge */}
              {pendingAudio && (
                <button
                  onClick={() => { touchAudioContext(); setPendingAudio(false); }}
                  className="w-full mt-1.5 flex items-center justify-center gap-1.5 text-xs py-1 rounded transition-all animate-pulse"
                  style={{ color: 'hsl(18 90% 62%)', background: 'hsl(18 90% 52% / 0.08)' }}
                  data-testid="button-pending-audio"
                >
                  <Volume2 className="h-3 w-3" />
                  Tap to hear narration
                </button>
              )}
              {!pendingAudio && (
                <p
                  className="font-display text-xs tracking-wide mt-1.5 text-center"
                  style={{ color: 'hsl(42 20% 35%)', letterSpacing: '0.12em' }}
                >
                  Roll thy dice. Speak thy fate. Let the chronicle be written.
                </p>
              )}
            </div>
          </div>
        </main>

        {/* ── Right Panel ── */}
        <aside className="w-56 hidden xl:flex flex-col" style={{ borderLeft: '1px solid hsl(var(--gold-dark) / 0.2)', background: 'hsl(248 24% 7% / 0.6)' }}>
          {/* Panel tabs */}
          <div className="flex" style={{ borderBottom: '1px solid hsl(var(--gold-dark) / 0.2)' }}>
            {([
              { id: 'caves',  label: 'Caves'  },
              { id: 'combat', label: 'Combat' },
              { id: 'dice',   label: 'Dice'   },
              { id: 'guide',  label: '? Help' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setRightPanel(id)}
                className={`flex-1 py-2 text-xs font-display tracking-wide transition-colors ${
                  rightPanel === id
                    ? id === 'guide'
                      ? 'text-amber-400 border-b-2 border-amber-500'
                      : 'text-amber-400 border-b-2 border-amber-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`button-panel-${id}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightPanel === 'caves' && campaign && (
              <div className="h-full overflow-y-auto p-3">
                <CaveProgress
                  cavesCleared={JSON.parse(campaign.cavesCleared ?? '[]')}
                  partyLevel={campaign.partyLevel ?? 1}
                />
              </div>
            )}
            {rightPanel === 'combat' && campaign && (
              <div className="h-full overflow-y-auto p-3">
                <CombatTracker campaign={campaign} />
              </div>
            )}
            {rightPanel === 'dice' && (
              <div className="h-full overflow-y-auto p-3">
                <DiceHelper onRollResult={(result) => setInput(prev => prev + (prev ? '\n' : '') + result)} />
              </div>
            )}
            {rightPanel === 'guide' && <DiceGuide />}
          </div>
        </aside>
      </div>
    </div>
  );
}

// Individual message bubble component
function MessageBubble({
  message,
  onSpeak,
  ttsActive,
}: {
  message: Message;
  onSpeak: (text: string) => void;
  ttsActive: boolean;
}) {
  const isDM = message.role === 'assistant';

  if (!isDM) {
    return (
      <div className="flex items-start gap-3 justify-end message-enter">
        <div className="flex-1 max-w-sm">
          <div className="player-bubble rounded-lg px-4 py-3 ml-8">
            <p className="font-display tracking-wide text-sm" style={{ color: 'hsl(40 22% 70%)' }}>{message.content}</p>
          </div>
          <p className="font-display text-xs tracking-widest mt-1 pr-1 text-right" style={{ color: 'hsl(42 18% 34%)' }}>
            — THE ADVENTURER
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'hsl(248 24% 13%)', border: '1px solid hsl(var(--gold-dark) / 0.3)' }}
        >
          <span className="text-xs" style={{ color: 'hsl(var(--gold) / 0.7)' }}>⚔</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message-enter group">
      <div className="flex items-start gap-3">
        {/* DM icon — gilt scroll */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 flex-shrink-0"
          style={{
            background: 'linear-gradient(160deg, hsl(38 55% 28%), hsl(36 48% 20%))',
            border: '1px solid hsl(var(--gold-dark) / 0.6)',
            boxShadow: '0 0 8px hsl(var(--gold) / 0.2)',
          }}
        >
          <Scroll className="h-3.5 w-3.5" style={{ color: 'hsl(var(--gold))' }} />
        </div>

        {/* Parchment manuscript panel */}
        <div className="flex-1 manuscript-entry rounded-lg p-4 pl-6 dm-content relative">
          <div className="manuscript-prose">
            {renderContent(message.content, true)}
          </div>

          {/* Speak button — visible on hover */}
          <button
            onClick={() => onSpeak(message.content)}
            className="mt-2 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity font-display text-xs tracking-wide flex items-center gap-1"
            style={{ color: 'hsl(32 45% 32%)' }}
            data-testid={`button-speak-${message.id}`}
          >
            <Volume2 className="h-3 w-3" />
            {ttsActive ? 'Silence the Voice' : 'Speak this aloud'}
          </button>
        </div>
      </div>
    </div>
  );
}
