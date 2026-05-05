import { useState } from 'react';

interface Props {
  onRollResult?: (result: string) => void;
}

const DICE = [
  { sides: 4, label: 'd4', color: 'text-purple-400' },
  { sides: 6, label: 'd6', color: 'text-blue-400' },
  { sides: 8, label: 'd8', color: 'text-cyan-400' },
  { sides: 10, label: 'd10', color: 'text-green-400' },
  { sides: 12, label: 'd12', color: 'text-amber-400' },
  { sides: 20, label: 'd20', color: 'text-red-400' },
  { sides: 100, label: 'd100', color: 'text-rose-400' },
];

const MODIFIERS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

function roll(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceHelper({ onRollResult }: Props) {
  const [modifier, setModifier] = useState(0);
  const [lastRoll, setLastRoll] = useState<{ die: string; raw: number; total: number } | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const rollDie = (sides: number, label: string) => {
    const raw = roll(sides);
    const total = raw + modifier;
    const result = { die: label, raw, total };
    setLastRoll(result);
    
    const msg = modifier !== 0
      ? `${label}: rolled ${raw} + (${modifier >= 0 ? '+' : ''}${modifier}) = **${total}**`
      : `${label}: rolled **${raw}**`;
    
    setHistory(h => [msg, ...h].slice(0, 8));
    onRollResult?.(msg);
  };

  const d20WithAdvantage = () => {
    const r1 = roll(20);
    const r2 = roll(20);
    const higher = Math.max(r1, r2);
    const total = higher + modifier;
    const msg = `d20 (Advantage): rolled ${r1} & ${r2}, took ${higher}${modifier !== 0 ? ` + (${modifier >= 0 ? '+' : ''}${modifier})` : ''} = **${total}**`;
    setLastRoll({ die: 'd20 (Adv)', raw: higher, total });
    setHistory(h => [msg, ...h].slice(0, 8));
    onRollResult?.(msg);
  };

  const d20WithDisadvantage = () => {
    const r1 = roll(20);
    const r2 = roll(20);
    const lower = Math.min(r1, r2);
    const total = lower + modifier;
    const msg = `d20 (Disadvantage): rolled ${r1} & ${r2}, took ${lower}${modifier !== 0 ? ` + (${modifier >= 0 ? '+' : ''}${modifier})` : ''} = **${total}**`;
    setLastRoll({ die: 'd20 (Dis)', raw: lower, total });
    setHistory(h => [msg, ...h].slice(0, 8));
    onRollResult?.(msg);
  };

  return (
    <div className="space-y-3" data-testid="dice-helper">
      <p className="font-display text-amber-500/80 text-xs tracking-widest uppercase">Dice Roller</p>
      
      {/* Last roll display */}
      {lastRoll && (
        <div className="stone-panel rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground font-display">{lastRoll.die}</p>
          <p className="text-3xl font-display text-amber-400">{lastRoll.total}</p>
          {lastRoll.raw !== lastRoll.total && (
            <p className="text-xs text-muted-foreground">raw {lastRoll.raw} + mod {modifier >= 0 ? '+' : ''}{modifier}</p>
          )}
        </div>
      )}

      {/* Modifier selector */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Modifier</p>
        <div className="flex flex-wrap gap-1">
          {MODIFIERS.map(m => (
            <button
              key={m}
              onClick={() => setModifier(m)}
              className={`w-8 h-6 rounded text-xs font-display transition-colors ${
                modifier === m
                  ? 'bg-amber-600 text-stone-900'
                  : 'bg-stone-800 text-muted-foreground hover:bg-stone-700 hover:text-foreground'
              }`}
              data-testid={`button-modifier-${m}`}
            >
              {m >= 0 ? `+${m}` : m}
            </button>
          ))}
        </div>
      </div>

      {/* Dice buttons */}
      <div className="grid grid-cols-2 gap-1">
        {DICE.map(d => (
          <button
            key={d.sides}
            onClick={() => rollDie(d.sides, d.label)}
            className={`py-2 rounded stone-panel border-stone-700 hover:border-amber-700 transition-all text-center font-display text-sm ${d.color} hover:scale-105 active:scale-95`}
            data-testid={`button-roll-${d.label}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Advantage / Disadvantage */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={d20WithAdvantage}
          className="py-1.5 rounded bg-emerald-900/40 border border-emerald-800 hover:border-emerald-600 text-xs text-emerald-400 font-display transition-colors"
          data-testid="button-roll-advantage"
        >
          Adv d20
        </button>
        <button
          onClick={d20WithDisadvantage}
          className="py-1.5 rounded bg-red-900/40 border border-red-800 hover:border-red-600 text-xs text-red-400 font-display transition-colors"
          data-testid="button-roll-disadvantage"
        >
          Dis d20
        </button>
      </div>

      {/* Roll history */}
      {history.length > 0 && (
        <div className="border-t border-stone-800 pt-2 space-y-1">
          <p className="text-xs text-muted-foreground/50 font-display">History</p>
          {history.map((h, i) => (
            <p key={i} className="text-xs text-muted-foreground/70 leading-snug">{h.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
          ))}
        </div>
      )}
    </div>
  );
}
