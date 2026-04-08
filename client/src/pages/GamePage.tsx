import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import type { Campaign, Message } from '@shared/schema';
import { speakText, stopSpeech, isSpeaking } from '@/lib/tts';
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
  const [ttsVoice, setTtsVoice] = useState<'browser' | 'elevenlabs'>('browser');
  const [rightPanel, setRightPanel] = useState<'combat' | 'dice' | 'caves'>('caves');
  const abortRef = useRef<AbortController | null>(null);

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

  // Auto-speak last DM message when it arrives
  const speakDMMessage = useCallback(async (text: string) => {
    if (!ttsEnabled) return;
    setTtsActive(true);
    await speakText(text, {
      voice: ttsVoice,
      rate: 0.9,
      pitch: 0.85,
      onEnd: () => setTtsActive(false),
      onError: () => setTtsActive(false),
    });
  }, [ttsEnabled, ttsVoice]);

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
  const resetMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/campaign/reset'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/campaign'] });
      qc.invalidateQueries({ queryKey: ['/api/messages', campaign?.id] });
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
                className="w-full justify-start text-xs text-muted-foreground hover:text-amber-400 h-7"
                onClick={() => {
                  if (confirm('Reset HP and spell slots for a new session?')) {
                    resetMutation.mutate();
                  }
                }}
                data-testid="button-reset-session"
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                New Session
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
              {/* Welcome state */}
              {messages.length === 0 && !streamingText && (
                <div className="text-center py-12 space-y-4">
                  <ChroniclerLogo className="w-20 h-20 mx-auto logo-glow torch-flicker" />
                  <div className="space-y-2">
                    <h2 className="font-display text-amber-400 text-xl tracking-wider">The Adventure Awaits</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                      Place your party tokens at the entrance to Cave A. The map is on the table.
                      When you're ready — speak your first action, or ask The Chronicler to begin.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'Begin the adventure',
                      'We search for traps at the entrance',
                      'Zella casts Light on her spellbook',
                      'We try to listen at the cave mouth',
                    ].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-stone-700 text-muted-foreground hover:border-amber-600 hover:text-amber-400 transition-colors"
                        data-testid={`button-suggestion-${suggestion.substring(0, 10)}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message history */}
              {messages.map((msg, idx) => (
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
