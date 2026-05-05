/**
 * DiceGuide — tutorial panel for new players
 * Explains what dice to use, when to roll, and how to report results.
 * Covers the Heroes of the Borderlands starter set characters.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Swords, Wand2, Shield, Dices } from 'lucide-react';

// ── Data ────────────────────────────────────────────────────────────────────

const DICE_SHAPES = [
  { die: 'd20', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50',
    use: 'Attacks, skill checks, saving throws — the most-used die in the game' },
  { die: 'd12', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/50',
    use: 'Rare damage rolls — greataxes and some special abilities' },
  { die: 'd8',  color: 'text-red-400',    bg: 'bg-red-950/40 border-red-800/50',
    use: "Longbow damage, some spells. Also Gideon's hit die when levelling up" },
  { die: 'd6',  color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50',
    use: "Dagger / short sword damage. Gideon's Sneak Attack uses extra d6s" },
  { die: 'd4',  color: 'text-lime-400',   bg: 'bg-lime-950/40 border-lime-800/50',
    use: "Zella's Magic Missile (1d4 + 1 per dart) and minor spells" },
];

const GIDEON_ROLLS = [
  { label: 'Dagger / Short Sword Attack', roll: 'd20 + 4', result: 'Hit if total ≥ enemy AC' },
  { label: 'Dagger Damage',               roll: 'd6 + 2',  result: 'Subtract from enemy HP' },
  { label: 'Sneak Attack Damage',         roll: '+1d6',     result: 'Add when you have advantage or an ally is adjacent' },
  { label: 'Stealth (Hide / Sneak)',      roll: 'd20 + 5',  result: '≥ 12 to slip past unnoticed' },
  { label: 'Perception (Spot / Listen)',  roll: 'd20 + 3',  result: 'Spot hidden things or hear danger' },
  { label: 'Thieves\' Tools (Traps / Locks)', roll: 'd20 + 5', result: 'Difficulty set by The Chronicler' },
];

const ZELLA_ROLLS = [
  { label: 'Spell Attack (Fire Bolt etc.)', roll: 'd20 + 4', result: 'Hit if total ≥ enemy AC' },
  { label: 'Fire Bolt Damage',              roll: 'd10',      result: 'Subtract from enemy HP' },
  { label: 'Magic Missile',                 roll: '3 × (d4 + 1)', result: 'Always hits — no roll needed' },
  { label: 'Arcana / History',             roll: 'd20 + 4',  result: 'Remember lore and magical knowledge' },
  { label: 'Investigation (Search)',        roll: 'd20 + 4',  result: 'Find hidden objects, clues, triggers' },
  { label: 'Concentration Save (if hit)',   roll: 'd20 + 1',  result: '≥ 10 or half damage — keep spell going' },
];

const HOW_TO_PLAY = [
  { icon: '1', title: 'The Chronicler sets the scene', body: 'Read what The Chronicler narrates — it describes where you are, what you see, and who you meet.' },
  { icon: '2', title: 'You declare your action', body: 'Type what you want to do: "I attack the goblin with my dagger" or "Zella casts Fire Bolt at the skeleton".' },
  { icon: '3', title: 'The Chronicler tells you what to roll', body: 'The Chronicler will say something like "Roll a d20 + 4 to attack." Pick up that physical die and roll it.' },
  { icon: '4', title: 'Report your result', body: 'Type the number you rolled (e.g. "I rolled a 14"). The Chronicler adds your bonus and narrates the outcome.' },
  { icon: '5', title: 'Track HP on your physical sheet', body: 'Gideon starts at 9 HP. Zella starts at 7 HP. Subtract damage as enemies hit you. The sidebar shows your current HP.' },
];

const COMMON_ACTIONS = [
  { action: 'Attack a monster',       example: '"Gideon stabs the goblin with his dagger"' },
  { action: 'Cast a spell',           example: '"Zella fires a Fire Bolt at the orc"' },
  { action: 'Search the room',        example: '"We search the cave for traps or treasure"' },
  { action: 'Sneak past an enemy',    example: '"Gideon tries to slip behind the guard"' },
  { action: 'Talk to an NPC',         example: '"Zella tries to persuade the merchant"' },
  { action: 'Use an item',            example: '"Gideon drinks his healing potion"' },
  { action: 'Move to another room',   example: '"We head deeper into Cave A"' },
  { action: 'Take a short rest',      example: '"Can we rest for an hour to recover?"' },
];

// ── Component ────────────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-stone-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-900/60 hover:bg-stone-900/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-display text-xs tracking-widest text-amber-300">{title}</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 bg-stone-950/40">{children}</div>}
    </div>
  );
}

export default function DiceGuide() {
  return (
    <div className="h-full overflow-y-auto p-3 space-y-3 text-xs">

      {/* Header */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <HelpCircle className="h-4 w-4 text-amber-400" />
          <span className="font-display text-amber-400 tracking-widest text-sm">ADVENTURER'S GUIDE</span>
        </div>
        <p className="text-muted-foreground/70 leading-relaxed">
          New to D&D? This panel has everything you need.<br/>
          Physical dice + this guide = you're ready.
        </p>
      </div>

      {/* How to Play */}
      <Section title="HOW TO PLAY" icon={<Dices className="h-3.5 w-3.5 text-amber-400" />}>
        <div className="space-y-3">
          {HOW_TO_PLAY.map(step => (
            <div key={step.icon} className="flex gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="font-display text-stone-900 text-xs font-bold">{step.icon}</span>
              </div>
              <div>
                <p className="font-display tracking-wide text-amber-200/90">{step.title}</p>
                <p className="text-muted-foreground/70 leading-relaxed mt-0.5">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Dice shapes */}
      <Section title="YOUR DICE" icon={<Dices className="h-3.5 w-3.5 text-orange-400" />}>
        <div className="space-y-2">
          {DICE_SHAPES.map(d => (
            <div key={d.die} className={`flex items-start gap-2.5 p-2 rounded border ${d.bg}`}>
              <span className={`font-display font-bold text-sm w-8 flex-shrink-0 ${d.color}`}>{d.die}</span>
              <span className="text-muted-foreground/80 leading-relaxed">{d.use}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Gideon rolls */}
      <Section title="GIDEON'S ROLLS" icon={<Swords className="h-3.5 w-3.5 text-red-400" />}>
        <p className="text-muted-foreground/60 mb-2">Halfling Rogue · HP 9 · AC 14</p>
        <div className="space-y-1.5">
          {GIDEON_ROLLS.map(r => (
            <div key={r.label} className="rounded p-2 bg-stone-900/50 border border-stone-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-amber-200/80">{r.label}</span>
                <span className="font-display font-bold text-amber-400 whitespace-nowrap">{r.roll}</span>
              </div>
              <p className="text-muted-foreground/55 mt-0.5 italic">{r.result}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Zella rolls */}
      <Section title="ZELLA'S ROLLS" icon={<Wand2 className="h-3.5 w-3.5 text-purple-400" />}>
        <p className="text-muted-foreground/60 mb-2">Human Wizard · HP 7 · AC 13 · Spell slots: 2</p>
        <div className="space-y-1.5">
          {ZELLA_ROLLS.map(r => (
            <div key={r.label} className="rounded p-2 bg-stone-900/50 border border-stone-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-200/80">{r.label}</span>
                <span className="font-display font-bold text-purple-400 whitespace-nowrap">{r.roll}</span>
              </div>
              <p className="text-muted-foreground/55 mt-0.5 italic">{r.result}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Common actions */}
      <Section title="WHAT CAN I SAY?" icon={<Shield className="h-3.5 w-3.5 text-green-400" />}>
        <p className="text-muted-foreground/60 mb-2">Type any of these into the chronicle box:</p>
        <div className="space-y-1.5">
          {COMMON_ACTIONS.map(a => (
            <div key={a.action} className="p-2 rounded bg-stone-900/50 border border-stone-800">
              <p className="text-amber-200/80 font-display tracking-wide">{a.action}</p>
              <p className="text-muted-foreground/55 italic mt-0.5">{a.example}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Tip */}
      <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-amber-200/70 leading-relaxed">
        <p className="font-display text-amber-400 tracking-wide mb-1">PRO TIP</p>
        You can ask The Chronicler anything in plain English — "What spells does Zella have?", "How much HP do we have left?", "What does Sneak Attack mean?" It will always answer.
      </div>

      <div className="pb-2" />
    </div>
  );
}
