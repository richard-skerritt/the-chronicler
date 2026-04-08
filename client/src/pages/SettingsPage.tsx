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
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

        {/* Manual Overrides */}
        <div className="space-y-6">
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
              <p className="text-xs">Built with Claude AI (Anthropic) · ElevenLabs TTS · React + Express</p>
              <p className="text-xs text-amber-500/60">Based on the D&D Heroes of the Borderlands (2025 Starter Set) campaign</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
