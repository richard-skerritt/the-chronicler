import type { Campaign } from '@shared/schema';

interface Props {
  campaign: Campaign;
}

function HPBar({ current, max, color = 'amber' }: { current: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = pct <= 25;
  const isMid = pct <= 50;
  
  const barColor = isLow
    ? 'bg-red-500'
    : isMid
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full hp-bar-fill ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-display tabular-nums ${isLow ? 'text-red-400' : isMid ? 'text-amber-400' : 'text-emerald-400'}`}>
        {current}/{max}
      </span>
    </div>
  );
}

function SpellPips({ used, max }: { used: number; max: number }) {
  const remaining = max - used;
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`spell-pip ${i < remaining ? 'available' : 'used'}`}
          title={i < remaining ? 'Spell slot available' : 'Spell slot used'}
        />
      ))}
    </div>
  );
}

export default function CharacterPanel({ campaign }: Props) {
  const zellaUsed = campaign.zellaMaxSpellSlots - campaign.zellaSpellSlots;

  return (
    <div
      className="flex px-4 py-2 gap-6"
      style={{
        borderTop: '1px solid hsl(var(--gold-dark) / 0.2)',
        background: 'hsl(248 28% 6% / 0.6)',
      }}
    >
      {/* Gideon */}
      <div className="flex-1 min-w-0" data-testid="panel-gideon">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🗡️</span>
            <span className="font-display text-xs tracking-wide" style={{ color: 'hsl(42 78% 68%)' }}>GIDEON</span>
            <span className="text-xs text-muted-foreground/60">Halfling Rogue</span>
          </div>
          <span className="text-xs text-muted-foreground">AC 13</span>
        </div>
        <HPBar current={campaign.gideonHp} max={campaign.gideonMaxHp} />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: 'hsl(42 60% 48% / 0.75)' }}>💰 {campaign.gideonGold} GP</span>
          <span className="text-xs text-muted-foreground/50">Initiative +3</span>
        </div>
      </div>

      <div className="w-px" style={{ background: 'hsl(var(--gold-dark) / 0.2)' }} />

      {/* Zella */}
      <div className="flex-1 min-w-0" data-testid="panel-zella">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">✨</span>
            <span className="font-display text-xs tracking-wide" style={{ color: 'hsl(265 52% 72%)' }}>ZELLA</span>
            <span className="text-xs text-muted-foreground/60">Human Wizard</span>
          </div>
          <span className="text-xs text-muted-foreground">AC 12</span>
        </div>
        <HPBar current={campaign.zellaHp} max={campaign.zellaMaxHp} />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'hsl(42 60% 48% / 0.75)' }}>💰 {campaign.zellaGold} GP</span>
            <SpellPips used={zellaUsed} max={campaign.zellaMaxSpellSlots} />
          </div>
          <span className="text-xs text-muted-foreground/50">Initiative +2</span>
        </div>
      </div>
    </div>
  );
}
