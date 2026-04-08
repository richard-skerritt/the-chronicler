import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Campaign } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { ArrowLeft, Save, RotateCcw, Volume2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Prefs, type VoiceProvider } from '@/lib/preferences';

// ElevenLabs narrator voices (male, cinematic)
const ELEVENLABS_VOICES = [
  { id: 'james',   label: 'James',   desc: 'Deep, authoritative narrator' },
  { id: 'george',  label: 'George',  desc: 'Rich baritone storyteller' },
  { id: 'daniel',  label: 'Daniel',  desc: 'Smooth, clear narrator' },
  { id: 'brian',   label: 'Brian',   desc: 'Calm, measured tone' },
  { id: 'callum',  label: 'Callum',  desc: 'Warm, expressive voice' },
  { id: 'harry',   label: 'Harry',   desc: 'Dramatic, powerful delivery' },
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

  // Voice settings (pulled from prefs singleton)
  const [voiceProvider, setVoiceProviderState] = useState<VoiceProvider>(Prefs.voice.provider);
  const [elVoice, setElVoiceState] = useState(Prefs.voice.elevenLabsVoice);
  const [sfKey, setSfKeyState] = useState(Prefs.voice.speechifyKey);
  const [sfVoiceId, setSfVoiceIdState] = useState(Prefs.voice.speechifyVoiceId);
  const [testingVoice, setTestingVoice] = useState(false);

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
    Prefs.setProvider(voiceProvider);
    Prefs.setElevenLabsVoice(elVoice);
    Prefs.setSpeechifyKey(sfKey);
    Prefs.setSpeechifyVoiceId(sfVoiceId);
    toast({ title: 'Voice saved', description: `Using ${voiceProvider === 'speechify' ? 'Speechify' : voiceProvider === 'elevenlabs' ? 'ElevenLabs' : 'browser'} voice.` });
  };

  const testVoice = async () => {
    setTestingVoice(true);
    try {
      const { speakText } = await import('@/lib/tts');
      await speakText('The caves stretch before you, dark and full of promise. Welcome, adventurer.', {
        voice: voiceProvider,
        voiceName: elVoice,
        speechifyKey: sfKey,
        speechifyVoiceId: sfVoiceId,
        onEnd: () => setTestingVoice(false),
        onError: () => setTestingVoice(false),
      });
    } catch {
      setTestingVoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-background stone-texture">
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
              Choose how The Chronicler speaks. ElevenLabs voices are high-quality AI narrators. Speechify requires your API key.
            </p>

            {/* Provider tabs */}
            <div className="flex gap-2 mb-4">
              {(['elevenlabs', 'speechify', 'browser'] as VoiceProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setVoiceProviderState(p)}
                  className={`px-3 py-1.5 rounded text-xs font-display tracking-wide transition-colors ${
                    voiceProvider === p
                      ? 'bg-amber-600 text-stone-900'
                      : 'bg-stone-800 text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`button-provider-${p}`}
                >
                  {p === 'elevenlabs' ? 'ElevenLabs' : p === 'speechify' ? 'Speechify' : 'Browser'}
                </button>
              ))}
            </div>

            {/* ElevenLabs voice picker */}
            {voiceProvider === 'elevenlabs' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Select narrator voice:</p>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVENLABS_VOICES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setElVoiceState(v.id)}
                      className={`p-2.5 rounded border text-left transition-colors ${
                        elVoice === v.id
                          ? 'border-amber-600 bg-amber-950/30 text-foreground'
                          : 'border-stone-700 bg-stone-900/40 text-muted-foreground hover:border-stone-600'
                      }`}
                      data-testid={`button-voice-${v.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs tracking-wide">{v.label}</span>
                        {elVoice === v.id && <Check className="h-3 w-3 text-amber-400" />}
                      </div>
                      <p className="text-xs opacity-60 mt-0.5">{v.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Speechify settings */}
            {voiceProvider === 'speechify' && (
              <div className="space-y-3">
                <div className="bg-amber-950/20 border border-amber-800/30 rounded p-3 text-xs text-amber-300/80">
                  Get your API key from{' '}
                  <a href="https://studio.speechify.com" target="_blank" rel="noopener noreferrer"
                    className="underline text-amber-400">studio.speechify.com</a>
                  {' '}→ API Settings. The "John" voice ID is <code className="bg-stone-800 px-1 rounded">john</code>.
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-display">Speechify API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={sfKey}
                    onChange={e => setSfKeyState(e.target.value)}
                    className="bg-input border-stone-700 h-8 text-sm font-mono"
                    data-testid="input-speechify-key"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-display">Voice ID</Label>
                  <Input
                    placeholder="john"
                    value={sfVoiceId}
                    onChange={e => setSfVoiceIdState(e.target.value)}
                    className="bg-input border-stone-700 h-8 text-sm"
                    data-testid="input-speechify-voice-id"
                  />
                  <p className="text-xs text-muted-foreground">Common IDs: john, jane, ryan, oliver</p>
                </div>
              </div>
            )}

            {/* Browser info */}
            {voiceProvider === 'browser' && (
              <p className="text-xs text-muted-foreground">
                Uses your browser's built-in text-to-speech engine. Quality varies by browser — Chrome on desktop gives the best results.
              </p>
            )}

            {/* Test + Save buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={testVoice}
                disabled={testingVoice}
                variant="outline"
                className="border-stone-700 text-muted-foreground hover:text-amber-400 font-display text-xs"
                data-testid="button-test-voice"
              >
                <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                {testingVoice ? 'Speaking...' : 'Test Voice'}
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
              <p>The Chronicler is an AI-powered Game Master for tabletop RPG adventures. Players use physical game components — maps, tokens, and dice — while The Chronicler handles narration, NPC roleplay, rules adjudication, and immersive storytelling.</p>
              <p className="text-xs">Built with Claude AI (Anthropic) · ElevenLabs TTS · Speechify · React + Express</p>
              <p className="text-xs text-amber-500/60">Based on the D&amp;D Heroes of the Borderlands (2025 Starter Set) campaign</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
