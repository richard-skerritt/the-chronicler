import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link, useLocation } from 'wouter';
import type { Campaign, Message } from '@shared/schema';
import { speakText, stopSpeech, isSpeaking } from '@/lib/tts';
import { Prefs } from '@/lib/preferences';
import { useTheme } from '@/components/ThemeProvider';
import CharacterPanel from '@/components/CharacterPanel';
import CaveProgress from '@/components/CaveProgress';
import CombatTracker from '@/components/CombatTracker';
import DiceHelper from '@/components/DiceHelper';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Send, Volume2, VolumeX, Settings, RotateCcw, Sword, BookOpen, Moon, Sun, Mic, MicOff, Scroll
} from 'lucide-react';

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

// Render DM response with formatting
function renderContent(text: string): React.ReactNode {
  const parts = text.split('\n');
  return parts.map((line, i) => {
    if (!line.trim()) return <br key={i} />;

    // Horizontal rule --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      return <hr key={i} className="border-0 border-t border-amber-800/40 my-3" />;
    }

    // H1 heading
    if (line.startsWith('# ')) {
      const heading = line.slice(2);
      return (
        <h3 key={i} className="font-display text-amber-400 text-base tracking-wider uppercase mt-3 mb-1">
          {heading}
        </h3>
      );
    }

    // H2 heading
    if (line.startsWith('## ')) {
      const heading = line.slice(3);
      return (
        <h4 key={i} className="font-display text-amber-300/80 text-sm tracking-wider uppercase mt-2 mb-1">
          {heading}
        </h4>
      );
    }

    // Parse inline formatting
    const formatted = line
      .split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|⚔️.*|💰.*|✨.*|📍.*)/g)
      .map((chunk, j) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
          return <strong key={j}>{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2) {
          return <em key={j} className="text-amber-300 italic">{chunk.slice(1, -1)}</em>;
        }
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
          return <code key={j} className="text-purple-300 bg-purple-950/50 px-1 rounded text-sm">{chunk.slice(1, -1)}</code>;
        }
        // Status lines (emoji prefixed)
        if (/^[⚔️💰✨📍🎲🛡️❤️]/.test(chunk)) {
          return <span key={j} className="text-amber-400/80 font-display text-xs">{chunk}</span>;
        }
        return chunk;
      });

    // Status lines get special treatment
    if (/^[⚔️💰✨📍🎲]/.test(line)) {
      return (
        <p key={i} className="text-amber-400/70 text-xs font-display border-t border-stone-800 pt-1 mt-1">
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
  const [rightPanel, setRightPanel] = useState<'combat' | 'dice' | 'caves'>('caves');
  const abortRef = useRef<AbortController | null>(null);

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
      voice: p.provider as any,
      voiceName: p.elevenLabsVoice,
      speechifyKey: p.speechifyKey,
      speechifyVoiceId: p.speechifyVoiceId,
      rate: 0.9,
      pitch: 0.85,
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
        voice: p.provider as any,
        voiceName: p.elevenLabsVoice,
        speechifyKey: p.speechifyKey,
        speechifyVoiceId: p.speechifyVoiceId,
        rate: 0.9,
        pitch: 0.85,
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
      const response = await fetch('/api/chat', {
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
    <div className="min-h-screen bg-background flex flex-col stone-texture">
      {/* ── Top Header ── */}
      <header className="border-b border-stone-800 bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <ChroniclerLogo className="w-8 h-8 logo-glow" />
            <div>
              <h1 className="font-display text-amber-400 text-base leading-none tracking-widest">THE CHRONICLER</h1>
              <p className="text-muted-foreground text-xs">Heroes of the Borderlands</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* TTS toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (ttsActive) { stopSpeech(); setTtsActive(false); }
                else setTtsEnabled(e => !e);
              }}
              className={`h-8 w-8 ${ttsActive ? 'tts-active text-amber-400' : ttsEnabled ? 'text-amber-400' : 'text-muted-foreground'}`}
              title={ttsActive ? 'Stop speaking' : ttsEnabled ? 'Voice ON (click to mute)' : 'Voice OFF (click to enable)'}
              data-testid="button-tts-toggle"
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Panel toggle: combat / dice / caves */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightPanel(p => p === 'combat' ? 'caves' : p === 'caves' ? 'dice' : 'combat')}
              className="h-8 w-8 text-muted-foreground hover:text-amber-400"
              title="Toggle right panel"
              data-testid="button-panel-toggle"
            >
              {rightPanel === 'combat' ? <Sword className="h-4 w-4" /> : rightPanel === 'caves' ? <Scroll className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-48 border-r border-stone-800 bg-card/40 hidden lg:flex flex-col">
          <div className="p-3 space-y-4 flex-1 overflow-y-auto">
            {/* Location */}
            <div>
              <p className="font-display text-amber-500 text-xs tracking-widest mb-2 uppercase">Location</p>
              <p className="text-sm text-foreground leading-snug">{campaign?.currentLocation ?? 'Unknown'}</p>
              {inCombat && (
                <Badge variant="destructive" className="mt-1 text-xs font-display tracking-wide">
                  ⚔️ IN COMBAT
                </Badge>
              )}
            </div>

            <Separator className="bg-stone-800" />

            {/* Cave progress mini-view */}
            <div>
              <p className="font-display text-amber-500 text-xs tracking-widest mb-2 uppercase">Progress</p>
              <CaveProgress
                cavesCleared={JSON.parse(campaign?.cavesCleared ?? '[]')}
                partyLevel={campaign?.partyLevel ?? 1}
                compact
              />
            </div>

            <Separator className="bg-stone-800" />

            {/* Session actions */}
            <div className="space-y-1">
              <p className="font-display text-amber-500 text-xs tracking-widest mb-2 uppercase">Session</p>
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
          <div className="p-3 border-t border-stone-800">
            <div className="text-center">
              <p className="font-display text-muted-foreground text-xs tracking-widest">PARTY LEVEL</p>
              <p className="font-display text-amber-400 text-2xl">{campaign?.partyLevel ?? 1}</p>
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
                  <ChroniclerLogo className="w-20 h-20 mx-auto torch-flicker" style={{ filter: 'drop-shadow(0 0 18px hsl(18 90% 52% / 0.7))' }} />
                  <div className="space-y-2">
                    <h2 className="font-display text-xl tracking-wider" style={{ color: 'hsl(18 80% 58%)' }}>The Adventure Awaits</h2>
                    <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'hsl(38 16% 52%)' }}>
                      {campaign?.gameMode === 'custom' && campaign?.char1
                        ? `Your party is assembled and ready. Speak your first action to begin.`
                        : 'Place your party tokens at Cave A. When ready — speak your first action, or ask The Chronicler to begin.'}
                    </p>
                  </div>
                  {/* Demo button */}
                  <div>
                    <button
                      onClick={startDemo}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-sm tracking-wide transition-all duration-200"
                      style={{
                        background: 'linear-gradient(135deg, hsl(18 90% 46%), hsl(0 72% 40%))',
                        color: 'hsl(38 28% 94%)',
                        border: '1px solid hsl(18 90% 55% / 0.5)',
                        boxShadow: '0 0 18px hsl(18 90% 52% / 0.3)',
                      }}
                      data-testid="button-start-demo"
                    >
                      <Scroll className="h-4 w-4" />
                      Watch the Demo
                    </button>
                    <p className="text-xs mt-2" style={{ color: 'hsl(38 12% 40%)' }}>See a scripted adventure with full narration — no setup needed</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-1">
                    {[
                      'Begin the adventure',
                      'We search for traps at the entrance',
                      'Zella casts Light on her spellbook',
                      'We try to listen at the cave mouth',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                        style={{ borderColor: 'hsl(28 12% 22%)', color: 'hsl(38 14% 46%)' }}
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
                          <div className="bg-stone-700 rounded-lg px-4 py-2.5 text-sm text-foreground">
                            {msg.content}
                          </div>
                          <p className="text-xs text-muted-foreground text-right mt-1">You</p>
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="flex items-start gap-3 message-enter">
                        <div className="w-7 h-7 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Scroll className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <div className="flex-1 stone-panel rounded-lg p-4 text-sm dm-content">
                          <div className="narration text-foreground/90">
                            {renderContent(msg.content)}
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
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-900 font-display text-sm tracking-wide transition-colors"
                          data-testid="button-demo-next"
                        >
                          Continue →
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-muted-foreground text-sm">The demo is complete.</p>
                          <button
                            onClick={exitDemo}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-900 font-display text-sm tracking-wide transition-colors glow-gold"
                            data-testid="button-demo-start-adventure"
                          >
                            <Scroll className="h-4 w-4" />
                            Start Your Own Adventure
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
                    <div className="w-7 h-7 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scroll className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="flex-1 stone-panel rounded-lg p-4 text-sm dm-content">
                      <div className="narration text-foreground/90">
                        {renderContent(streamingText)}
                      </div>
                      <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* ── Input Bar ── */}
          <div className="border-t border-stone-800 bg-card p-3">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What do you do? (Enter to send, Shift+Enter for new line)"
                    className="resize-none bg-input border-stone-700 focus:border-amber-600 text-sm min-h-[44px] max-h-32 pr-2 font-body placeholder:text-muted-foreground/50"
                    rows={1}
                    disabled={isStreaming}
                    data-testid="input-player-action"
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="bg-amber-600 hover:bg-amber-500 text-stone-900 h-11 w-11 flex-shrink-0 font-display glow-gold"
                  size="icon"
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/50 mt-1.5 text-center">
                The Chronicler is your Game Master — roll physical dice and report the result
              </p>
            </div>
          </div>
        </main>

        {/* ── Right Panel ── */}
        <aside className="w-56 border-l border-stone-800 bg-card/40 hidden xl:flex flex-col">
          {/* Panel tabs */}
          <div className="flex border-b border-stone-800">
            {(['caves', 'combat', 'dice'] as const).map(panel => (
              <button
                key={panel}
                onClick={() => setRightPanel(panel)}
                className={`flex-1 py-2 text-xs font-display tracking-wide transition-colors capitalize ${
                  rightPanel === panel
                    ? 'text-amber-400 border-b-2 border-amber-500'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`button-panel-${panel}`}
              >
                {panel}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {rightPanel === 'caves' && campaign && (
              <CaveProgress
                cavesCleared={JSON.parse(campaign.cavesCleared ?? '[]')}
                partyLevel={campaign.partyLevel ?? 1}
              />
            )}
            {rightPanel === 'combat' && campaign && (
              <CombatTracker campaign={campaign} />
            )}
            {rightPanel === 'dice' && (
              <DiceHelper onRollResult={(result) => setInput(prev => prev + (prev ? '\n' : '') + result)} />
            )}
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
          <div className="bg-stone-800/60 rounded-lg px-4 py-3 text-sm text-foreground/80 ml-8">
            <p className="leading-relaxed">{message.content}</p>
          </div>
          <p className="text-xs text-muted-foreground/40 text-right mt-1 pr-1">You</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-stone-700 border border-stone-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs">⚔</span>
        </div>
      </div>
    );
  }

  return (
    <div className="message-enter group">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-amber-900/50 border border-amber-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Scroll className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="flex-1 stone-panel rounded-lg p-4 text-sm dm-content">
          <div className="narration text-foreground/90">
            {renderContent(message.content)}
          </div>

          {/* Speak button (appears on hover) */}
          <button
            onClick={() => onSpeak(message.content)}
            className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-amber-400 flex items-center gap-1"
            data-testid={`button-speak-${message.id}`}
          >
            <Volume2 className="h-3 w-3" />
            {ttsActive ? 'Stop' : 'Speak this'}
          </button>
        </div>
      </div>
    </div>
  );
}
