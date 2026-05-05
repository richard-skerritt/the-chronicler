import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, API_BASE } from '@/lib/queryClient';
import type { Campaign } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { ArrowLeft, Save, RotateCcw, Volume2, Check, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Prefs } from '@/lib/preferences';

const PRESET_VOICES = [
  { id: 'george',  label: 'George',  desc: 'Raspy British — narrator' },
  { id: 'james',   label: 'James',   desc: 'Deep, authoritative' },
  { id: 'daniel',  label: 'Daniel',  desc: 'Smooth British' },
  { id: 'harry',   label: 'Harry',   desc: 'Dramatic, powerful' },
  { id: 'callum',  label: 'Callum',  desc: 'Warm, expressive' },
  { id: 'brian',   label: 'Brian',   desc: 'Deep, measured' },
  { id: '_custom', label: 'My Voice', desc: 'Your custom ElevenLabs voice' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: campaign } = useQuery<Campaign>({ queryKey: ['/api/campaign'] });
  const [gideonHp, setGideonHp] = useState('');
  const [zellaHp, setZellaHp] = useState('');
  const [zellaSlots, setZellaSlots] = useState('');
  const [gideonGold, setGideonGold] = useState('');
  const [zellaGold, setZellaGold] = useState('');
  const [location, setLocation] = useState('');

  // Voice settings
  const [elApiKey, setElApiKeyState] = useState(Prefs.voice.elevenLabsApiKey);
  const savedVoice = Prefs.voice.voiceName;
  const isCustomSaved = !PRESET_VOICES.slice(0, -1).find(v => v.id === savedVoice);
  const [selectedVoice, setSelectedVoice] = useState(isCustomSaved ? '_custom' : savedVoice);
  const [customVoiceId, setCustomVoiceId] = useState(isCustomSaved ? savedVoice : '');
  type TestStatus = 'idle' | 'testing' | 'success' | 'error';
  type TestResult = { status: TestStatus; message: string; detail?: string };
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: '' });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      apiRequest('PATCH', `/api/campaign/${campaign?.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/campaign'] });
      toast({ title: 'Saved', description: 'Campaign state updated.' });
    },
  });

  const saveStats = () => {
    const updates: Partial<Campaign> = {};
    if (gideonHp) updates.gideonHp = parseInt(gideonHp);
    if (zellaHp) updates.zellaHp = parseInt(zellaHp);
    if (zellaSlots) updates.zellaSpellSlots = parseInt(zellaSlots);
    if (gideonGold) updates.gideonGold = parseInt(gideonGold);
    if (zellaGold) updates.zellaGold = parseInt(zellaGold);
    if (location) updates.currentLocation = location;
    updateMutation.mutate(updates);
  };

  const resetFull = useMutation({
    mutationFn: () => apiRequest('POST', '/api/campaign/reset'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/campaign'] });
      toast({ title: 'Session reset', description: 'HP and spell slots restored.' });
    },
  });

  const saveVoice = () => {
    const resolved = selectedVoice === '_custom' ? customVoiceId.trim() : selectedVoice;
    if (!resolved) {
      toast({ title: 'No voice selected', description: 'Enter a custom voice ID or pick a preset voice.' });
      return;
    }
    Prefs.setElevenLabsApiKey(elApiKey);
    Prefs.setVoiceName(resolved);
    const label = selectedVoice === '_custom' ? `Custom (${resolved.substring(0, 8)}…)` : resolved;
    toast({ title: 'Voice saved', description: elApiKey ? `Using: ${label}` : 'Add your API key to enable narration.' });
  };

  const testVoice = async () => {
    setTestResult({ status: 'testing', message: 'Connecting to ElevenLabs…' });
    try {
      if (!elApiKey.trim()) {
        setTestResult({ status: 'error', message: 'No API key entered', detail: 'Paste your ElevenLabs API key above. Get one free at elevenlabs.io → Profile → API Keys.' });
        return;
      }
      const rawVoiceName = selectedVoice === '_custom' ? customVoiceId.trim() : selectedVoice;
      if (!rawVoiceName) {
        setTestResult({ status: 'error', message: 'No voice selected', detail: 'Pick a preset voice or enter your custom voice ID.' });
        return;
      }
      // Route via server proxy (avoids iframe CSP restrictions on direct ElevenLabs calls)
      const { touchAudioContext } = await import('@/lib/tts');
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'The caves stretch before you, dark and full of ancient mystery. Welcome, adventurer.',
          provider: 'elevenlabs',
          voice: rawVoiceName,
          elevenLabsKey: elApiKey,
        }),
      });
      if (!res.ok) {
        setTestResult({ status: 'error', message: `Server error — HTTP ${res.status}`, detail: 'The server could not reach ElevenLabs. Check your internet connection.' });
        return;
      }

      // Server returns raw binary MP3 on success, JSON on fallback/error
      const ct = res.headers.get('content-type') || '';
      let audioSrc: string | null = null;
      let blobUrl: string | null = null;

      if (ct.includes('audio')) {
        // Binary MP3 — wrap in a blob URL
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        audioSrc = blobUrl;
      } else {
        const data = await res.json() as { audio?: string | null; fallback?: boolean; error?: string };
        if (data.audio) audioSrc = data.audio;
      }

      if (!audioSrc) {
        setTestResult({ status: 'error', message: 'ElevenLabs returned no audio', detail: `Key may be invalid, or voice ID "${rawVoiceName.substring(0, 20)}" not found on your account.` });
        return;
      }

      touchAudioContext();
      const audio = new Audio(audioSrc);
      audio.onended = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
      audio.onerror = () => setTestResult({ status: 'error', message: 'Audio received but failed to play', detail: 'Try clicking anywhere on the page first, then Test Voice again.' });
      audio.play()
        .then(() => setTestResult({
          status: 'success',
          message: 'Connected — audio playing',
          detail: `Voice "${rawVoiceName}" is working correctly. Click Save Voice to use it in the game.`,
        }))
        .catch(() => setTestResult({ status: 'error', message: 'Audio received but autoplay blocked', detail: 'Click anywhere on the page first, then try Test Voice again.' }));
    } catch (err) {
      setTestResult({ status: 'error', message: 'Unexpected error', detail: String(err) });
    }
  };

  return (
    <div className="min-h-screen page-overlay">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-amber-400" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <ChroniclerLogo className="w-8 h-8 logo-glow" />
            <div>
              <h1 className="font-display text-amber-400 text-lg tracking-widest">SETTINGS</h1>
              <p className="text-muted-foreground text-xs">Campaign & Session Configuration</p>
            </div>
          </div>
        </div>

        {/* Current State */}
        {campaign && (
          <div className="stone-panel rounded-lg p-5 mb-6" data-testid="current-state">
            <h2 className="font-display text-amber-300 text-sm tracking-widest mb-4">CURRENT STATE</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Gideon HP</p>
                <p className="font-display text-foreground">{campaign.gideonHp} / {campaign.gideonMaxHp}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Gideon Gold</p>
                <p className="font-display text-amber-400">{campaign.gideonGold} GP</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Zella HP</p>
                <p className="font-display text-foreground">{campaign.zellaHp} / {campaign.zellaMaxHp}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Zella Spell Slots</p>
                <p className="font-display text-purple-400">{campaign.zellaSpellSlots} / {campaign.zellaMaxSpellSlots}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Location</p>
                <p className="font-display text-foreground text-sm">{campaign.currentLocation}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Party Level</p>
                <p className="font-display text-amber-400">{campaign.partyLevel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Caves Cleared</p>
                <p className="font-display text-foreground">
                  {JSON.parse(campaign.cavesCleared || '[]').length} / 11
                </p>
              </div>
            </div>
          </div>
        )}

        <Separator className="bg-stone-800 mb-6" />

        {/* ── VOICE SETTINGS ── */}
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-amber-300 text-sm tracking-widest mb-1">NARRATOR VOICE</h2>
            <p className="text-muted-foreground text-xs mb-4">
              Powered by{' '}
              <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline text-amber-400/80 hover:text-amber-400">ElevenLabs</a>.
              {' '}Get a free API key at elevenlabs.io → Profile → API Keys.
            </p>

            <div className="space-y-4">
              {/* API Key */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">
                  API Key
                  {elApiKey && <span className="ml-2 text-green-400">✓ set</span>}
                </Label>
                <Input
                  type="password"
                  placeholder="sk_... — get free key at elevenlabs.io"
                  value={elApiKey}
                  onChange={e => setElApiKeyState(e.target.value)}
                  className="bg-input border-stone-700 h-9 text-sm font-mono"
                  data-testid="input-el-api-key"
                />
              </div>

              {/* Voice picker */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-display">Narrator Voice</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_VOICES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`p-2.5 rounded border text-left transition-colors ${
                        selectedVoice === v.id
                          ? 'border-amber-600 bg-amber-950/30 text-foreground'
                          : 'border-stone-700 bg-stone-900/40 text-muted-foreground hover:border-stone-600'
                      }`}
                      data-testid={`button-voice-${v.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs tracking-wide">{v.label}</span>
                        {selectedVoice === v.id && <Check className="h-3 w-3 text-amber-400" />}
                      </div>
                      <p className="text-xs opacity-60 mt-0.5">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom voice ID input */}
              {selectedVoice === '_custom' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-display">Your Voice ID</Label>
                  <Input
                    placeholder="Paste your ElevenLabs voice ID here"
                    value={customVoiceId}
                    onChange={e => setCustomVoiceId(e.target.value)}
                    className="bg-input border-stone-700 h-9 text-sm font-mono"
                    data-testid="input-custom-voice-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find it in ElevenLabs → Voice Library → your voice → ID (looks like <span className="font-mono">abc1def2ghi3…</span>)
                  </p>
                </div>
              )}
            </div>

            {/* Test + Save buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={testVoice}
                disabled={testResult.status === 'testing'}
                variant="outline"
                className="border-stone-700 text-muted-foreground hover:text-amber-400 font-display text-xs"
                data-testid="button-test-voice"
              >
                {testResult.status === 'testing'
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <Volume2 className="h-3.5 w-3.5 mr-1.5" />}
                {testResult.status === 'testing' ? 'Testing…' : 'Test Voice'}
              </Button>
              <Button
                onClick={saveVoice}
                className="bg-amber-600 hover:bg-amber-500 text-stone-900 font-display tracking-wide text-xs glow-gold"
                data-testid="button-save-voice"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Voice
              </Button>
            </div>

            {/* Test result banner */}
            {testResult.status !== 'idle' && (
              <div
                className={`mt-3 rounded-lg border p-3 flex items-start gap-2.5 text-xs transition-all ${
                  testResult.status === 'testing' ? 'border-stone-700 bg-stone-900/60 text-muted-foreground' :
                  testResult.status === 'success' ? 'border-green-700/50 bg-green-950/25 text-green-300' :
                  'border-red-800/50 bg-red-950/20 text-red-300'
                }`}
                data-testid="banner-test-result"
              >
                <span className="mt-0.5 shrink-0">
                  {testResult.status === 'testing' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {testResult.status === 'success' && <CheckCircle className="h-4 w-4 text-green-400" />}
                  {testResult.status === 'error'   && <XCircle   className="h-4 w-4 text-red-400" />}
                </span>
                <div className="min-w-0">
                  <p className="font-display tracking-wide leading-snug">{testResult.message}</p>
                  {testResult.detail && (
                    <p className="mt-1 opacity-70 leading-relaxed">{testResult.detail}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-stone-800" />

          {/* Manual Overrides */}
          <div>
            <h2 className="font-display text-amber-300 text-sm tracking-widest mb-4">MANUAL OVERRIDES</h2>
            <p className="text-muted-foreground text-xs mb-4">
              Correct the tracked state if it drifts from your physical game. Leave blank to keep current values.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">Gideon HP</Label>
                <Input
                  type="number"
                  placeholder={String(campaign?.gideonHp ?? 9)}
                  value={gideonHp}
                  onChange={e => setGideonHp(e.target.value)}
                  className="bg-input border-stone-700 h-8 text-sm"
                  data-testid="input-gideon-hp"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">Gideon Gold (GP)</Label>
                <Input
                  type="number"
                  placeholder={String(campaign?.gideonGold ?? 33)}
                  value={gideonGold}
                  onChange={e => setGideonGold(e.target.value)}
                  className="bg-input border-stone-700 h-8 text-sm"
                  data-testid="input-gideon-gold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">Zella HP</Label>
                <Input
                  type="number"
                  placeholder={String(campaign?.zellaHp ?? 7)}
                  value={zellaHp}
                  onChange={e => setZellaHp(e.target.value)}
                  className="bg-input border-stone-700 h-8 text-sm"
                  data-testid="input-zella-hp"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">Zella Spell Slots</Label>
                <Input
                  type="number"
                  placeholder={String(campaign?.zellaSpellSlots ?? 2)}
                  min={0}
                  max={campaign?.zellaMaxSpellSlots ?? 2}
                  value={zellaSlots}
                  onChange={e => setZellaSlots(e.target.value)}
                  className="bg-input border-stone-700 h-8 text-sm"
                  data-testid="input-zella-slots"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">Zella Gold (GP)</Label>
                <Input
                  type="number"
                  placeholder={String(campaign?.zellaGold ?? 89)}
                  value={zellaGold}
                  onChange={e => setZellaGold(e.target.value)}
                  className="bg-input border-stone-700 h-8 text-sm"
                  data-testid="input-zella-gold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-display">Current Location</Label>
                <Input
                  placeholder={campaign?.currentLocation ?? 'Cave A — Entrance'}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="bg-input border-stone-700 h-8 text-sm"
                  data-testid="input-location"
                />
              </div>
            </div>

            <Button
              onClick={saveStats}
              className="mt-4 bg-amber-600 hover:bg-amber-500 text-stone-900 font-display tracking-wide glow-gold"
              data-testid="button-save-stats"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>

          <Separator className="bg-stone-800" />

          {/* Session reset */}
          <div>
            <h2 className="font-display text-amber-300 text-sm tracking-widest mb-2">NEW SESSION</h2>
            <p className="text-muted-foreground text-xs mb-4">
              Restore HP and spell slots to maximum (for starting a new play session after a Long Rest outside the caves). Clears chat history.
            </p>
            <Button
              onClick={() => {
                if (confirm('Start a new session? This will clear chat history and restore HP/spell slots.')) {
                  resetFull.mutate();
                }
              }}
              variant="outline"
              className="border-stone-700 text-muted-foreground hover:text-foreground hover:border-stone-600 font-display tracking-wide"
              data-testid="button-new-session"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Session (Long Rest)
            </Button>
          </div>

          <Separator className="bg-stone-800" />

          {/* About */}
          <div>
            <h2 className="font-display text-amber-300 text-sm tracking-widest mb-3">ABOUT THE CHRONICLER</h2>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>The Chronicler is an AI-