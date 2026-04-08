import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Campaign, CombatState, CombatantState } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ChevronRight, SkipForward } from 'lucide-react';

interface Props {
  campaign: Campaign;
}

export default function CombatTracker({ campaign }: Props) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newHp, setNewHp] = useState('');
  const [newAc, setNewAc] = useState('');
  const [newInit, setNewInit] = useState('');

  const combatState: CombatState | null = campaign.combatState
    ? JSON.parse(campaign.combatState)
    : null;

  const updateState = useMutation({
    mutationFn: (data: Partial<Campaign>) =>
      apiRequest('PATCH', `/api/campaign/${campaign.id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/campaign'] }),
  });

  const startCombat = () => {
    const initial: CombatState = {
      round: 1,
      currentTurn: 0,
      combatants: [
        { name: 'Gideon', hp: campaign.gideonHp, maxHp: campaign.gideonMaxHp, ac: 13, initiative: 0, isPlayer: true },
        { name: 'Zella', hp: campaign.zellaHp, maxHp: campaign.zellaMaxHp, ac: 12, initiative: 0, isPlayer: true },
      ],
    };
    updateState.mutate({
      inCombat: true,
      combatState: JSON.stringify(initial),
    });
  };

  const endCombat = () => {
    updateState.mutate({ inCombat: false, combatState: null });
  };

  const nextTurn = () => {
    if (!combatState) return;
    const next = (combatState.currentTurn + 1) % combatState.combatants.length;
    const newRound = next === 0 ? combatState.round + 1 : combatState.round;
    updateState.mutate({
      combatState: JSON.stringify({ ...combatState, currentTurn: next, round: newRound }),
    });
  };

  const addCombatant = () => {
    if (!newName || !combatState) return;
    const combatant: CombatantState = {
      name: newName,
      hp: parseInt(newHp) || 10,
      maxHp: parseInt(newHp) || 10,
      ac: parseInt(newAc) || 10,
      initiative: parseInt(newInit) || 0,
      isPlayer: false,
    };
    const updated = {
      ...combatState,
      combatants: [...combatState.combatants, combatant].sort((a, b) => b.initiative - a.initiative),
    };
    updateState.mutate({ combatState: JSON.stringify(updated) });
    setNewName(''); setNewHp(''); setNewAc(''); setNewInit('');
  };

  const damageHp = (idx: number, dmg: number) => {
    if (!combatState) return;
    const updated = { ...combatState };
    updated.combatants = updated.combatants.map((c, i) =>
      i === idx ? { ...c, hp: Math.max(0, c.hp - dmg) } : c
    );
    updateState.mutate({ combatState: JSON.stringify(updated) });
  };

  const removeCombatant = (idx: number) => {
    if (!combatState) return;
    const updated = {
      ...combatState,
      combatants: combatState.combatants.filter((_, i) => i !== idx),
      currentTurn: Math.min(combatState.currentTurn, Math.max(0, combatState.combatants.length - 2)),
    };
    updateState.mutate({ combatState: JSON.stringify(updated) });
  };

  if (!campaign.inCombat) {
    return (
      <div className="space-y-3" data-testid="combat-tracker-idle">
        <div className="text-center py-4 space-y-3">
          <div className="text-2xl">⚔️</div>
          <p className="text-xs text-muted-foreground">No active combat</p>
          <Button
            size="sm"
            onClick={startCombat}
            className="w-full bg-red-800 hover:bg-red-700 text-white font-display tracking-wide text-xs"
            data-testid="button-start-combat"
          >
            Start Combat
          </Button>
        </div>
        <div className="text-xs text-muted-foreground/60 space-y-1 border-t border-stone-800 pt-3">
          <p className="font-display text-amber-500/70 tracking-wide">Quick Reference</p>
          <p>Initiative: d20 + mod</p>
          <p>Gideon: +3 | Zella: +2</p>
          <p>Sneak Attack: +1d6/turn</p>
          <p>Spell DC: 13</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="combat-tracker-active">
      {/* Round + Next turn */}
      <div className="flex items-center justify-between">
        <span className="font-display text-amber-400 text-sm">Round {combatState?.round ?? 1}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={nextTurn} className="h-6 text-xs text-amber-400 hover:text-amber-300 px-2" data-testid="button-next-turn">
            <SkipForward className="h-3 w-3 mr-1" />Next
          </Button>
          <Button size="sm" variant="ghost" onClick={endCombat} className="h-6 text-xs text-red-400 hover:text-red-300 px-2" data-testid="button-end-combat">
            End
          </Button>
        </div>
      </div>

      {/* Combatants */}
      <div className="space-y-1">
        {combatState?.combatants.map((c, idx) => {
          const isActive = idx === combatState.currentTurn;
          const hpPct = (c.hp / c.maxHp) * 100;
          const hpColor = hpPct <= 25 ? 'bg-red-500' : hpPct <= 50 ? 'bg-amber-500' : 'bg-emerald-500';

          return (
            <div
              key={idx}
              className={`combatant-row ${isActive ? 'active-turn' : c.isPlayer ? 'player' : 'enemy'}`}
              data-testid={`combatant-${c.name}`}
            >
              {isActive && <ChevronRight className="h-3 w-3 text-amber-400 flex-shrink-0" />}
              {!isActive && <div className="w-3 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-display truncate ${c.isPlayer ? 'text-amber-300' : 'text-red-300'}`}>
                    {c.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">AC {c.ac}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="flex-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                    <div className={`h-full ${hpColor} transition-all`} style={{ width: `${hpPct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{c.hp}/{c.maxHp}</span>
                </div>
              </div>
              {!c.isPlayer && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => { const d = prompt(`Damage to ${c.name}?`); if (d) damageHp(idx, parseInt(d)); }}
                    className="text-xs text-red-400 hover:text-red-300 px-1 transition-colors"
                    data-testid={`button-damage-${c.name}`}
                  >
                    −HP
                  </button>
                  <button
                    onClick={() => removeCombatant(idx)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
                    data-testid={`button-remove-${c.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add enemy */}
      <div className="border-t border-stone-800 pt-2 space-y-1" data-testid="add-combatant-form">
        <p className="text-xs text-muted-foreground font-display tracking-wide">Add enemy</p>
        <div className="grid grid-cols-2 gap-1">
          <Input
            placeholder="Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="h-6 text-xs bg-input border-stone-700 col-span-2"
            data-testid="input-enemy-name"
          />
          <Input placeholder="HP" value={newHp} onChange={e => setNewHp(e.target.value)} className="h-6 text-xs bg-input border-stone-700" data-testid="input-enemy-hp" />
          <Input placeholder="AC" value={newAc} onChange={e => setNewAc(e.target.value)} className="h-6 text-xs bg-input border-stone-700" data-testid="input-enemy-ac" />
          <Input placeholder="Init" value={newInit} onChange={e => setNewInit(e.target.value)} className="h-6 text-xs bg-input border-stone-700" data-testid="input-enemy-init" />
          <Button size="sm" onClick={addCombatant} className="h-6 text-xs bg-stone-700 hover:bg-stone-600" data-testid="button-add-enemy">
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
