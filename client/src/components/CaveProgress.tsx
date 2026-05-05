interface Props {
  cavesCleared: string[];
  partyLevel: number;
  compact?: boolean;
}

const CAVES = [
  { id: 'A', name: 'Kobold Lair', minLevel: 1 },
  { id: 'B', name: 'Mephit Lair', minLevel: 1 },
  { id: 'C', name: 'Nothic Lair', minLevel: 1 },
  { id: 'D', name: 'Goblin Lair', minLevel: 1 },
  { id: 'E', name: 'Ogre Lair', minLevel: 2 },
  { id: 'F', name: 'Hobgoblin Lair', minLevel: 2 },
  { id: 'G', name: 'Shunned Caves', minLevel: 2 },
  { id: 'H', name: 'Bugbear Lair', minLevel: 2 },
  { id: 'I', name: 'Minotaur Lair', minLevel: 2 },
  { id: 'J', name: 'Gnoll Lair', minLevel: 2 },
  { id: 'K', name: 'Shrine of Chaos', minLevel: 3, isFinal: true },
];

export default function CaveProgress({ cavesCleared, partyLevel, compact = false }: Props) {
  // A is always active (in progress)
  const activeId = 'A'; // simplified — could be made dynamic

  if (compact) {
    return (
      <div className="space-y-1">
        {CAVES.map(cave => {
          const cleared = cavesCleared.includes(cave.id);
          const locked = partyLevel < cave.minLevel && !cleared;
          const active = cave.id === activeId && !cleared;

          return (
            <div
              key={cave.id}
              className={`flex items-center gap-2 text-xs transition-colors ${
                cleared ? 'text-amber-500' : active ? 'text-foreground' : locked ? 'text-muted-foreground/30' : 'text-muted-foreground/60'
              }`}
              data-testid={`cave-${cave.id}`}
            >
              <div className={`cave-dot ${cleared ? 'cleared' : active ? 'active' : locked ? 'locked' : 'available'}`}>
                {cave.id}
              </div>
              {cave.isFinal && <span className="text-red-500/80">★</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-display text-muted-foreground text-xs tracking-widest uppercase mb-3">
        Caves of Chaos
      </p>
      {CAVES.map(cave => {
        const cleared = cavesCleared.includes(cave.id);
        const locked = partyLevel < cave.minLevel && !cleared;
        const active = cave.id === activeId && !cleared;

        return (
          <div
            key={cave.id}
            className={`flex items-center gap-2 py-1 transition-colors ${
              cleared ? '' : locked ? 'opacity-30' : ''
            }`}
            data-testid={`cave-detail-${cave.id}`}
          >
            <div className={`cave-dot flex-shrink-0 ${cleared ? 'cleared' : active ? 'active' : locked ? 'locked' : 'available'}`}>
              {cleared ? '✓' : cave.id}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs leading-none ${cleared ? 'text-amber-500 line-through' : active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {cave.name}
              </p>
              {cave.isFinal && (
                <p className="text-xs text-red-500/70 mt-0.5">Final Boss</p>
              )}
              {locked && (
                <p className="text-xs text-muted-foreground/40">Level {cave.minLevel}+ required</p>
              )}
            </div>
            {cleared && (
              <span className="text-xs text-amber-600">+25 GP</span>
            )}
          </div>
        );
      })}
      <div className="border-t border-stone-800 pt-2 mt-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-amber-400">{cavesCleared.length}</span>/11 cleared
        </p>
        <p className="text-xs text-amber-600/70 mt-0.5">
          Earned: {cavesCleared.length * 25} GP
        </p>
      </div>
    </div>
  );
}
