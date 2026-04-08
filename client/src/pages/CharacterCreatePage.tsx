import { useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { CharacterData } from '@shared/schema';
import ChroniclerLogo from '@/components/ChroniclerLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Dice6, RotateCcw, Wand2, Sword, Check } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// D&D Data
// ─────────────────────────────────────────────────────────────────────────────

const RACES = [
  { name: 'Human',     emoji: '🧑', bonuses: { str:1,dex:1,con:1,int:1,wis:1,cha:1 }, speed:30, desc:'Versatile and adaptable. +1 to all ability scores, extra skill & language.', traits:['Extra language','Extra skill proficiency','+1 to every ability score'] },
  { name: 'Elf',       emoji: '🧝', bonuses: { dex:2, int:1 },                          speed:30, desc:'Ancient and graceful. Keen senses and a natural affinity for magic.', traits:['Darkvision 60ft','Keen Senses (Perception prof.)','Fey Ancestry — advantage vs. charm'] },
  { name: 'Dwarf',     emoji: '⛏️', bonuses: { con:2, wis:1 },                          speed:25, desc:'Stalwart and enduring. Dwarven resilience and stone-cunning.', traits:['Darkvision 60ft','Dwarven Resilience — adv. vs. poison','Stonecunning — double prof. on History (stone)'] },
  { name: 'Halfling',  emoji: '🍀', bonuses: { dex:2, cha:1 },                          speed:25, desc:'Small, nimble, and incredibly lucky. Reroll 1s on the d20.', traits:['Lucky — reroll d20 1s','Brave — adv. vs. fright','Halfling Nimbleness — move through larger creatures'] },
  { name: 'Half-Orc',  emoji: '⚔️', bonuses: { str:2, con:1 },                          speed:30, desc:'Fierce and powerful. Orcish ferocity lets you survive lethal blows.', traits:['Darkvision 60ft','Menacing — Intimidation proficiency','Relentless Endurance — once per LR: drop to 1 HP instead of 0'] },
  { name: 'Tiefling',  emoji: '😈', bonuses: { cha:2, int:1 },                          speed:30, desc:'Bearing infernal heritage. Commands dark magic and fearsome presence.', traits:['Darkvision 60ft','Hellish Resistance — fire resistance','Infernal Legacy — Thaumaturgy cantrip'] },
  { name: 'Gnome',     emoji: '🔬', bonuses: { int:2, dex:1 },                          speed:25, desc:'Inquisitive and inventive. Gnome cunning foils magical trickery.', traits:['Darkvision 60ft','Gnome Cunning — adv. on INT/WIS/CHA saves vs. magic','Minor Illusion cantrip'] },
  { name: 'Dragonborn',emoji: '🐉', bonuses: { str:2, cha:1 },                          speed:30, desc:'Born of draconic power. Commands a fearsome breath weapon.', traits:['Draconic Ancestry (choose type)','Breath weapon once per rest','Resistance to ancestry damage type'] },
];

const CLASSES = [
  { name:'Fighter',   emoji:'🗡️',  hitDie:10, primaryStat:'STR or DEX', spellSlots:0, maxSpellSlots:0, startingGold:150, startingAc:18, desc:'Master of every weapon and armour. The most durable warrior in any fight.', features:['Fighting Style (choose one)','Second Wind — d10+1 HP once per rest (bonus action)'], equipment:['Chain mail (AC 16)','Shield (+2 AC)','Longsword','2× Handaxe'], skills:['Athletics','Intimidation'], saves:['STR','CON'], cantrips:[], spells:[] },
  { name:'Wizard',    emoji:'🔮',  hitDie:6,  primaryStat:'INT',        spellSlots:2, maxSpellSlots:2, startingGold:120, startingAc:12, desc:'Master of arcane magic. Devastating power at the cost of fragility.', features:['Spellbook (learn new spells by copying)','Arcane Recovery — regain 1 spell slot once per rest'], equipment:['Quarterstaff','Spellbook','Component pouch'], skills:['Arcana','History'], saves:['INT','WIS'], cantrips:['Fire Bolt','Mage Hand','Light'], spells:['Magic Missile','Sleep','Shield','Burning Hands'] },
  { name:'Rogue',     emoji:'🗝️',  hitDie:8,  primaryStat:'DEX',        spellSlots:0, maxSpellSlots:0, startingGold:100, startingAc:13, desc:'Cunning and stealthy. Strike hard from shadows, evade every trap.', features:["Sneak Attack +1d6 (once/turn with Advantage or nearby ally)",'Expertise — double proficiency in 2 chosen skills'], equipment:['Leather armour','2× Shortsword','Shortbow + 20 arrows',"Thieves' tools"], skills:['Stealth','Deception'], saves:['DEX','INT'], cantrips:[], spells:[] },
  { name:'Cleric',    emoji:'⚕️',  hitDie:8,  primaryStat:'WIS',        spellSlots:2, maxSpellSlots:2, startingGold:120, startingAc:16, desc:'Divine champion. Heals allies, smites enemies with holy power.', features:['Divine Domain (chosen at creation)','Spellcasting — WIS-based divine spells'], equipment:['Scale mail (AC 14)','Shield','Mace','Holy symbol'], skills:['Insight','Religion'], saves:['WIS','CHA'], cantrips:['Sacred Flame','Guidance','Spare the Dying'], spells:['Cure Wounds','Bless','Guiding Bolt','Healing Word'] },
  { name:'Ranger',    emoji:'🏹',  hitDie:10, primaryStat:'DEX',        spellSlots:0, maxSpellSlots:0, startingGold:120, startingAc:14, desc:'Hunter and tracker. Uses bow and blade with equal mastery in the wild.', features:['Favored Enemy (choose a creature type)','Natural Explorer (choose a terrain type)'], equipment:['Scale mail','2× Shortsword','Longbow + 20 arrows'], skills:['Animal Handling','Perception'], saves:['STR','DEX'], cantrips:[], spells:[] },
  { name:'Paladin',   emoji:'🛡️',  hitDie:10, primaryStat:'STR + CHA',  spellSlots:0, maxSpellSlots:0, startingGold:150, startingAc:18, desc:'Holy warrior bound by an oath. Merges martial skill with divine auras.', features:['Divine Sense — detect undead/fiends (CHA mod/day)','Lay on Hands — 5 HP healing pool per long rest'], equipment:['Chain mail (AC 16)','Shield','Longsword','Holy symbol'], skills:['Athletics','Persuasion'], saves:['WIS','CHA'], cantrips:[], spells:[] },
  { name:'Druid',     emoji:'🌿',  hitDie:8,  primaryStat:'WIS',        spellSlots:2, maxSpellSlots:2, startingGold:100, startingAc:13, desc:'Guardian of nature. Shapeshifts into beasts and commands storm and earth.', features:['Druidic secret language','Spellcasting — WIS-based nature spells'], equipment:['Leather armour','Shield','Scimitar','Druidic focus'], skills:['Nature','Survival'], saves:['INT','WIS'], cantrips:['Druidcraft','Guidance','Shillelagh'], spells:['Entangle','Healing Word','Thunderwave','Faerie Fire'] },
  { name:'Bard',      emoji:'🎵',  hitDie:8,  primaryStat:'CHA',        spellSlots:2, maxSpellSlots:2, startingGold:100, startingAc:13, desc:'Performer and jack-of-all-trades. Weaves magic through song and wit.', features:['Bardic Inspiration d6 — CHA mod uses per rest','Jack of All Trades — half proficiency on all skills'], equipment:['Leather armour','Rapier','Lute'], skills:['Deception','Performance'], saves:['DEX','CHA'], cantrips:['Vicious Mockery','Prestidigitation'], spells:['Healing Word','Charm Person','Disguise Self','Thunderwave'] },
];

const BACKGROUNDS = [
  { name:'Acolyte',  emoji:'🙏', skills:['Insight','Religion'],          feature:'Shelter of the Faithful — temples of your faith provide lodging.',          extraGold:15, desc:'Spent your life in service of a temple.' },
  { name:'Criminal', emoji:'🗡️', skills:['Deception','Stealth'],         feature:'Criminal Contact — a reliable contact in the criminal underworld.',          extraGold:15, desc:'A history of criminal activity. Every city knows your name.' },
  { name:'Folk Hero',emoji:'🌾', skills:['Animal Handling','Survival'],  feature:'Rustic Hospitality — common folk will shelter and protect you.',             extraGold:10, desc:'Rose from humble origins to stand against a tyrant.' },
  { name:'Noble',    emoji:'👑', skills:['History','Persuasion'],        feature:'Position of Privilege — always welcome in high society.',                     extraGold:25, desc:'Born to privilege. Understands politics and power.' },
  { name:'Sage',     emoji:'📚', skills:['Arcana','History'],            feature:'Researcher — you know where to find obscure information.',                    extraGold:10, desc:'Spent years poring over ancient texts for hidden knowledge.' },
  { name:'Soldier',  emoji:'⚔️', skills:['Athletics','Intimidation'],   feature:'Military Rank — soldiers of your former army respect your authority.',        extraGold:10, desc:'Fought in battles. Knows the horrors and discipline of war.' },
  { name:'Outlander',emoji:'🌲', skills:['Athletics','Survival'],        feature:'Wanderer — excellent memory for terrain; forage food for 5 daily.',           extraGold:10, desc:'Grew up in the wilds, far from civilisation.' },
  { name:'Charlatan',emoji:'🎭', skills:['Deception','Sleight of Hand'], feature:'False Identity — a complete alternate persona with documents.',               extraGold:15, desc:'Always has a scheme in motion and an escape route planned.' },
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const STAT_LABELS: Record<string, string> = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA' };
const STAT_FULL:   Record<string, string> = { str:'Strength', dex:'Dexterity', con:'Constitution', int:'Intelligence', wis:'Wisdom', cha:'Charisma' };

type StatKey = 'str'|'dex'|'con'|'int'|'wis'|'cha';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mod(score: number): number { return Math.floor((score - 10) / 2); }
function modStr(score: number): string { const m = mod(score); return m >= 0 ? `+${m}` : `${m}`; }

function roll4d6DropLowest(): number {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => a - b);
  return rolls.slice(1).reduce((a, b) => a + b, 0);
}

function calcHP(hitDie: number, conScore: number): number {
  return hitDie + mod(conScore);
}

function calcAC(className: string, dexScore: number): number {
  const c = CLASSES.find(x => x.name === className);
  if (!c) return 10;
  // Heavy armour classes use fixed AC
  if (['Fighter','Paladin'].includes(className)) return c.startingAc;
  if (className === 'Cleric') return c.startingAc; // scale + shield
  // Light armour: 11 + DEX mod
  if (['Rogue','Bard'].includes(className)) return 11 + Math.max(0, mod(dexScore));
  // Medium armour: 14 + DEX mod (max 2)
  if (['Ranger','Druid'].includes(className)) return 14 + Math.min(2, Math.max(0, mod(dexScore)));
  // No armour: 10 + DEX mod
  if (className === 'Wizard') return 10 + Math.max(0, mod(dexScore));
  return c.startingAc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

interface DraftCharacter {
  race: string;
  class: string;
  baseScores: Record<StatKey, number>; // before racial bonus
  assignedArray: (number | null)[];    // null = unassigned slot from pool
  background: string;
  name: string;
  alignment: string;
  scoreMethod: 'array' | 'roll';
  rolledScores: (number | null)[];     // 6 rolled values
}

const emptyDraft = (): DraftCharacter => ({
  race: '',
  class: '',
  baseScores: { str:0, dex:0, con:0, int:0, wis:0, cha:0 },
  assignedArray: [null, null, null, null, null, null],
  background: '',
  name: '',
  alignment: 'Neutral Good',
  scoreMethod: 'array',
  rolledScores: [null, null, null, null, null, null],
});

export default function CharacterCreatePage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<DraftCharacter>(emptyDraft);
  const [pickedScore, setPickedScore] = useState<number | null>(null);   // index from pool
  const [pickedStatTarget, setPickedStatTarget] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const setupMutation = useMutation({
    mutationFn: (body: { char1: CharacterData; char2?: CharacterData }) =>
      apiRequest('POST', '/api/campaign/setup', body),
    onSuccess: () => navigate('/game'),
  });

  // ── Helpers ─────────────────────────────────────────────────────────────

  const selectedRace  = RACES.find(r => r.name === draft.race);
  const selectedClass = CLASSES.find(c => c.name === draft.class);

  // Pool of scores to assign (either STANDARD_ARRAY or rolled)
  const scorePool: number[] = draft.scoreMethod === 'array'
    ? STANDARD_ARRAY
    : (draft.rolledScores.filter(s => s !== null) as number[]);

  // Which pool indices are already assigned
  const assignedPoolIndices = draft.assignedArray
    .map((val, idx) => val !== null ? idx : -1)
    .filter(i => i >= 0);

  // Final stat values: base + racial bonus
  function finalScore(stat: StatKey): number {
    const base = draft.baseScores[stat] || 0;
    const bonus = selectedRace?.bonuses[stat as keyof typeof selectedRace.bonuses] || 0;
    return base + (bonus as number);
  }

  // Can we advance?
  const canAdvance = () => {
    if (step === 1) return !!draft.race;
    if (step === 2) return !!draft.class;
    if (step === 3) {
      const allAssigned = STAT_NAMES.every(s => draft.baseScores[s] > 0);
      if (draft.scoreMethod === 'roll') return allAssigned && draft.rolledScores.filter(Boolean).length === 6;
      return allAssigned;
    }
    if (step === 4) return !!draft.background && draft.name.trim().length > 0;
    return true;
  };

  // ── Ability score assignment ─────────────────────────────────────────────

  function handlePickScore(poolIndex: number) {
    if (draft.assignedArray[poolIndex] !== null && draft.scoreMethod === 'array') return; // already used
    if (scorePool[poolIndex] === undefined) return;
    setPickedScore(poolIndex);
  }

  function handleAssignToStat(statIndex: number) {
    if (pickedScore === null) return;
    const value = scorePool[pickedScore];
    const newBaseScores = { ...draft.baseScores };
    const stat = STAT_NAMES[statIndex];

    // If there was already a value here, free it back to the pool
    const oldVal = draft.baseScores[stat];
    const newAssigned = [...draft.assignedArray];

    if (oldVal > 0) {
      // Find which pool index held this value and unmark it
      const prevPoolIdx = draft.scoreMethod === 'array'
        ? STANDARD_ARRAY.indexOf(oldVal)
        : draft.rolledScores.indexOf(oldVal);
      if (prevPoolIdx >= 0) newAssigned[prevPoolIdx] = null;
    }

    newBaseScores[stat] = value;
    newAssigned[pickedScore] = value;

    setDraft(d => ({ ...d, baseScores: newBaseScores, assignedArray: newAssigned }));
    setPickedScore(null);
  }

  function handleRollAll() {
    if (rolling) return;
    setRolling(true);
    const rolls = STAT_NAMES.map(() => roll4d6DropLowest());
    // Animate roll effect
    let count = 0;
    const interval = setInterval(() => {
      setDraft(d => ({
        ...d,
        rolledScores: STAT_NAMES.map((_, i) => Math.floor(Math.random() * 17) + 3) as any,
        baseScores: { str:0, dex:0, con:0, int:0, wis:0, cha:0 },
        assignedArray: [null, null, null, null, null, null],
      }));
      count++;
      if (count > 8) {
        clearInterval(interval);
        setDraft(d => ({
          ...d,
          rolledScores: rolls,
          baseScores: { str:0, dex:0, con:0, int:0, wis:0, cha:0 },
          assignedArray: [null, null, null, null, null, null],
        }));
        setRolling(false);
        setPickedScore(null);
      }
    }, 80);
  }

  function resetScores() {
    setDraft(d => ({
      ...d,
      baseScores: { str:0, dex:0, con:0, int:0, wis:0, cha:0 },
      assignedArray: [null, null, null, null, null, null],
    }));
    setPickedScore(null);
  }

  // ── Build final character ────────────────────────────────────────────────

  function buildCharacter(): CharacterData {
    const cls = selectedClass!;
    const bg  = BACKGROUNDS.find(b => b.name === draft.background)!;
    const fs  = STAT_NAMES.reduce((acc, s) => { acc[s] = finalScore(s); return acc; }, {} as Record<StatKey, number>);
    const hp  = calcHP(cls.hitDie, fs.con);
    const ac  = calcAC(draft.class, fs.dex);
    const gold = cls.startingGold + (bg?.extraGold ?? 0);
    const bgSkills = bg?.skills ?? [];
    const clsSkills = cls.skills ?? [];
    const allSkills = [...new Set([...clsSkills, ...bgSkills])];

    return {
      name: draft.name.trim(),
      race: draft.race,
      class: draft.class,
      level: 1,
      hp, maxHp: hp,
      ac, gold,
      str: fs.str, dex: fs.dex, con: fs.con, int: fs.int, wis: fs.wis, cha: fs.cha,
      strMod: mod(fs.str), dexMod: mod(fs.dex), conMod: mod(fs.con),
      intMod: mod(fs.int), wisMod: mod(fs.wis), chaMod: mod(fs.cha),
      background: draft.background,
      skills: allSkills,
      spellSlots: cls.spellSlots,
      maxSpellSlots: cls.maxSpellSlots,
      cantrips: cls.cantrips,
      spells: cls.spells,
      equipment: cls.equipment,
      features: cls.features,
      alignment: draft.alignment,
      speed: selectedRace?.speed ?? 30,
      hitDie: cls.hitDie,
      savingThrows: cls.saves,
    };
  }

  function handleStart() {
    const character = buildCharacter();
    setupMutation.mutate({ char1: character });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  function StepHeader() {
    return (
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <ChroniclerLogo className="w-7 h-7" />
          <span className="font-display text-xs tracking-widest" style={{ color: 'hsl(18 80% 55%)' }}>THE CHRONICLER</span>
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`step-indicator ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : 'pending'}`}
            />
          ))}
        </div>
        <div className="font-display text-xs tracking-widest" style={{ color: 'hsl(38 20% 45%)' }}>
          {step} / {TOTAL_STEPS}
        </div>
      </div>
    );
  }

  function NavButtons({ canNext = true }: { canNext?: boolean }) {
    return (
      <div className="flex justify-between mt-8">
        <Button
          variant="ghost"
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          className="font-display tracking-widest text-xs"
          style={{ color: 'hsl(38 20% 50%)' }}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step === 1 ? 'BACK' : 'PREVIOUS'}
        </Button>
        <Button
          disabled={!canNext || !canAdvance()}
          onClick={() => setStep(s => s + 1)}
          className="font-display tracking-widest text-xs px-6"
          style={{
            background: canAdvance() ? 'linear-gradient(135deg, hsl(18 90% 48%), hsl(0 72% 42%))' : undefined,
            color: canAdvance() ? 'hsl(38 28% 94%)' : undefined,
          }}
        >
          NEXT
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step renders
  // ─────────────────────────────────────────────────────────────────────────

  function Step1_Race() {
    return (
      <>
        <h2 className="font-display text-xl tracking-widest mb-1" style={{ color: 'hsl(38 28% 84%)' }}>CHOOSE YOUR RACE</h2>
        <p className="font-body text-sm mb-6" style={{ color: 'hsl(38 14% 50%)' }}>Your ancestry shapes your natural talents and physical abilities.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RACES.map(race => (
            <button
              key={race.name}
              className={`choice-card text-left ${draft.race === race.name ? 'selected' : ''}`}
              onClick={() => setDraft(d => ({ ...d, race: race.name }))}
              data-testid={`race-${race.name}`}
            >
              <div className="text-2xl mb-2">{race.emoji}</div>
              <div className="font-display text-sm tracking-wide mb-1" style={{ color: 'hsl(38 28% 84%)' }}>{race.name}</div>
              <div className="text-xs mb-2" style={{ color: 'hsl(38 14% 48%)' }}>
                {Object.entries(race.bonuses).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')}
              </div>
              {draft.race === race.name && (
                <div className="text-xs mt-2 pt-2 border-t border-orange-800/40" style={{ color: 'hsl(38 20% 58%)' }}>
                  {race.desc}
                </div>
              )}
            </button>
          ))}
        </div>
        {draft.race && (
          <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: 'hsl(18 90% 40% / 0.4)', background: 'hsl(18 90% 52% / 0.06)' }}>
            <p className="font-display text-sm tracking-wide mb-2" style={{ color: 'hsl(18 80% 58%)' }}>RACIAL TRAITS</p>
            <ul className="space-y-1">
              {selectedRace?.traits.map(t => (
                <li key={t} className="flex items-start gap-2 text-xs" style={{ color: 'hsl(38 20% 62%)' }}>
                  <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'hsl(18 80% 55%)' }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
        <NavButtons />
      </>
    );
  }

  function Step2_Class() {
    return (
      <>
        <h2 className="font-display text-xl tracking-widest mb-1" style={{ color: 'hsl(38 28% 84%)' }}>CHOOSE YOUR CLASS</h2>
        <p className="font-body text-sm mb-6" style={{ color: 'hsl(38 14% 50%)' }}>Your class defines your combat role, abilities, and special powers.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CLASSES.map(cls => (
            <button
              key={cls.name}
              className={`choice-card text-left ${draft.class === cls.name ? 'selected' : ''}`}
              onClick={() => setDraft(d => ({ ...d, class: cls.name }))}
              data-testid={`class-${cls.name}`}
            >
              <div className="text-2xl mb-2">{cls.emoji}</div>
              <div className="font-display text-sm tracking-wide mb-1" style={{ color: 'hsl(38 28% 84%)' }}>{cls.name}</div>
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="rounded px-1.5 py-0.5" style={{ background: 'hsl(0 72% 30% / 0.4)', color: 'hsl(0 60% 70%)' }}>
                  d{cls.hitDie} HD
                </span>
                {cls.spellSlots > 0 && (
                  <span className="rounded px-1.5 py-0.5" style={{ background: 'hsl(255 55% 30% / 0.4)', color: 'hsl(255 50% 75%)' }}>
                    Spells
                  </span>
                )}
              </div>
              <div className="text-xs" style={{ color: 'hsl(38 14% 44%)' }}>{cls.primaryStat}</div>
              {draft.class === cls.name && (
                <div className="text-xs mt-2 pt-2 border-t border-orange-800/40" style={{ color: 'hsl(38 20% 58%)' }}>
                  {cls.desc}
                </div>
              )}
            </button>
          ))}
        </div>
        {draft.class && (
          <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: 'hsl(18 90% 40% / 0.4)', background: 'hsl(18 90% 52% / 0.06)' }}>
            <p className="font-display text-sm tracking-wide mb-2" style={{ color: 'hsl(18 80% 58%)' }}>CLASS FEATURES AT LEVEL 1</p>
            <ul className="space-y-1">
              {selectedClass?.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'hsl(38 20% 62%)' }}>
                  <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'hsl(18 80% 55%)' }} />
                  {f}
                </li>
              ))}
              {selectedClass && (
                <li className="flex items-start gap-2 text-xs" style={{ color: 'hsl(38 20% 62%)' }}>
                  <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'hsl(18 80% 55%)' }} />
                  Saving throws: {selectedClass.saves.join(' & ')}
                </li>
              )}
            </ul>
          </div>
        )}
        <NavButtons />
      </>
    );
  }

  function Step3_AbilityScores() {
    const allPoolAssigned = scorePool.length === 6 &&
      scorePool.every((_, i) => draft.assignedArray[i] !== null);

    return (
      <>
        <h2 className="font-display text-xl tracking-widest mb-1" style={{ color: 'hsl(38 28% 84%)' }}>ABILITY SCORES</h2>
        <p className="font-body text-sm mb-4" style={{ color: 'hsl(38 14% 50%)' }}>
          Assign scores to your six abilities. Racial bonuses will be applied automatically.
        </p>

        {/* Method toggle */}
        <div className="flex gap-2 mb-6">
          {(['array', 'roll'] as const).map(method => (
            <button
              key={method}
              onClick={() => { setDraft(d => ({ ...d, scoreMethod: method, baseScores: { str:0,dex:0,con:0,int:0,wis:0,cha:0 }, assignedArray: [null,null,null,null,null,null], rolledScores: [null,null,null,null,null,null] })); setPickedScore(null); }}
              className={`font-display tracking-widest text-xs px-4 py-2 rounded border transition-all duration-150 ${draft.scoreMethod === method ? 'border-orange-500 text-orange-400' : 'border-stone-700 text-stone-500'}`}
              style={{ background: draft.scoreMethod === method ? 'hsl(18 90% 52% / 0.1)' : undefined }}
            >
              {method === 'array' ? '📋 STANDARD ARRAY' : '🎲 ROLL DICE'}
            </button>
          ))}
          <button onClick={resetScores} className="ml-auto font-display text-xs tracking-wider px-3 py-2 rounded border border-stone-700 text-stone-500 hover:border-stone-500 transition-colors">
            <RotateCcw className="w-3 h-3 inline mr-1" />RESET
          </button>
        </div>

        {/* Score pool */}
        <div className="mb-6">
          <p className="font-display text-xs tracking-widest mb-3" style={{ color: 'hsl(38 18% 48%)' }}>
            {draft.scoreMethod === 'array' ? 'STANDARD ARRAY — click a score then click a stat' : 'ROLLED SCORES — click a score then click a stat'}
          </p>

          {draft.scoreMethod === 'roll' && (
            <button
              onClick={handleRollAll}
              disabled={rolling}
              className="font-display tracking-widest text-xs px-6 py-2 rounded border mb-4 transition-all"
              style={{
                background: 'linear-gradient(135deg, hsl(18 90% 48%), hsl(0 72% 42%))',
                color: 'hsl(38 28% 94%)',
                border: '1px solid hsl(18 90% 55% / 0.5)',
                opacity: rolling ? 0.7 : 1,
              }}
            >
              <Dice6 className="w-4 h-4 inline mr-2" />
              {rolling ? 'ROLLING...' : 'ROLL 4d6 DROP LOWEST'}
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            {scorePool.map((score, i) => {
              const isUsed = draft.assignedArray[i] !== null;
              const isPicked = pickedScore === i;
              return (
                <button
                  key={i}
                  onClick={() => !isUsed && handlePickScore(i)}
                  className={`score-chip ${isUsed ? 'used' : ''} ${isPicked ? 'picked' : ''}`}
                  disabled={isUsed}
                >
                  {score}
                </button>
              );
            })}
          </div>
          {pickedScore !== null && (
            <p className="text-xs mt-2" style={{ color: 'hsl(42 88% 58%)' }}>
              Score <strong>{scorePool[pickedScore]}</strong> selected — now click a stat below to assign it.
            </p>
          )}
        </div>

        {/* Stat assignment boxes */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STAT_NAMES.map((stat, i) => {
            const base = draft.baseScores[stat];
            const bonus = selectedRace?.bonuses[stat as keyof typeof selectedRace.bonuses] || 0;
            const total = base + (bonus as number);
            const isFilled = base > 0;
            return (
              <button
                key={stat}
                onClick={() => pickedScore !== null && handleAssignToStat(i)}
                className={`stat-box ${isFilled ? 'filled' : ''} ${pickedScore !== null && !isFilled ? 'selected-target' : ''}`}
                data-testid={`stat-${stat}`}
              >
                <span className="font-display text-xs tracking-widest mb-1" style={{ color: 'hsl(38 18% 50%)' }}>{STAT_LABELS[stat]}</span>
                <span className="font-display text-2xl font-bold" style={{ color: isFilled ? 'hsl(38 28% 84%)' : 'hsl(38 14% 35%)' }}>
                  {isFilled ? total : '—'}
                </span>
                {isFilled && (
                  <span className="text-xs mt-0.5" style={{ color: (bonus as number) > 0 ? 'hsl(18 80% 58%)' : 'hsl(38 14% 48%)' }}>
                    {base}{(bonus as number) > 0 ? ` +${bonus}` : ''}
                    <span className="ml-1" style={{ color: 'hsl(38 20% 55%)' }}>({modStr(total)})</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <NavButtons canNext={canAdvance()} />
      </>
    );
  }

  function Step4_Background() {
    return (
      <>
        <h2 className="font-display text-xl tracking-widest mb-1" style={{ color: 'hsl(38 28% 84%)' }}>BACKGROUND & NAME</h2>
        <p className="font-body text-sm mb-6" style={{ color: 'hsl(38 14% 50%)' }}>Your background shapes who you were before the adventure began.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {BACKGROUNDS.map(bg => (
            <button
              key={bg.name}
              className={`choice-card text-left ${draft.background === bg.name ? 'selected' : ''}`}
              onClick={() => setDraft(d => ({ ...d, background: bg.name }))}
              data-testid={`bg-${bg.name}`}
            >
              <div className="text-2xl mb-2">{bg.emoji}</div>
              <div className="font-display text-sm tracking-wide mb-1" style={{ color: 'hsl(38 28% 84%)' }}>{bg.name}</div>
              <div className="text-xs" style={{ color: 'hsl(38 14% 44%)' }}>+{bg.extraGold} GP · {bg.skills.join(', ')}</div>
              {draft.background === bg.name && (
                <div className="text-xs mt-2 pt-2 border-t border-orange-800/40" style={{ color: 'hsl(38 20% 58%)' }}>
                  {bg.feature}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Character name */}
        <div className="mb-4">
          <label className="font-display text-xs tracking-widest block mb-2" style={{ color: 'hsl(38 18% 50%)' }}>CHARACTER NAME</label>
          <Input
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Enter your character's name..."
            className="font-body text-base"
            style={{ background: 'hsl(22 10% 10%)', borderColor: 'hsl(28 12% 22%)', color: 'hsl(38 28% 84%)' }}
            data-testid="input-character-name"
          />
        </div>

        {/* Alignment */}
        <div className="mb-2">
          <label className="font-display text-xs tracking-widest block mb-2" style={{ color: 'hsl(38 18% 50%)' }}>ALIGNMENT (optional)</label>
          <div className="flex flex-wrap gap-2">
            {['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'].map(a => (
              <button
                key={a}
                onClick={() => setDraft(d => ({ ...d, alignment: a }))}
                className="font-display text-xs tracking-wide px-3 py-1.5 rounded border transition-all"
                style={{
                  borderColor: draft.alignment === a ? 'hsl(18 90% 52%)' : 'hsl(28 12% 22%)',
                  background:  draft.alignment === a ? 'hsl(18 90% 52% / 0.12)' : 'transparent',
                  color:       draft.alignment === a ? 'hsl(18 80% 62%)' : 'hsl(38 14% 44%)',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <NavButtons />
      </>
    );
  }

  function Step5_Review() {
    if (!selectedRace || !selectedClass) return null;
    const bg = BACKGROUNDS.find(b => b.name === draft.background);
    const fs = STAT_NAMES.reduce((acc, s) => { acc[s] = finalScore(s); return acc; }, {} as Record<StatKey, number>);
    const hp = calcHP(selectedClass.hitDie, fs.con);
    const ac = calcAC(draft.class, fs.dex);
    const gold = selectedClass.startingGold + (bg?.extraGold ?? 0);

    return (
      <>
        <h2 className="font-display text-xl tracking-widest mb-1" style={{ color: 'hsl(38 28% 84%)' }}>YOUR CHARACTER</h2>
        <p className="font-body text-sm mb-6 italic" style={{ color: 'hsl(38 14% 50%)' }}>
          Review your hero before the adventure begins.
        </p>

        <div className="rounded-xl border p-6 mb-6" style={{ borderColor: 'hsl(18 90% 40% / 0.3)', background: 'hsl(18 90% 52% / 0.04)' }}>
          {/* Name + identity */}
          <div className="flex items-baseline gap-3 mb-4">
            <h3 className="font-display text-2xl tracking-wide" style={{ color: 'hsl(38 28% 88%)' }}>{draft.name || 'Unnamed Hero'}</h3>
            <span className="font-display text-sm tracking-widest" style={{ color: 'hsl(18 80% 55%)' }}>
              {draft.race} {draft.class}
            </span>
          </div>

          {/* Core stats row */}
          <div className="flex flex-wrap gap-4 mb-5 pb-4 border-b" style={{ borderColor: 'hsl(28 12% 18%)' }}>
            {[
              { label: 'HP', value: `${hp}`, color: 'hsl(0 65% 55%)' },
              { label: 'AC', value: `${ac}`, color: 'hsl(200 55% 55%)' },
              { label: 'Speed', value: `${selectedRace.speed}ft`, color: 'hsl(120 38% 48%)' },
              { label: 'Hit Die', value: `d${selectedClass.hitDie}`, color: 'hsl(38 70% 55%)' },
              { label: 'Gold', value: `${gold} GP`, color: 'hsl(42 88% 58%)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center">
                <span className="font-display text-xl font-bold" style={{ color }}>{value}</span>
                <span className="font-display text-xs tracking-widest" style={{ color: 'hsl(38 14% 42%)' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-2 mb-5">
            {STAT_NAMES.map(s => (
              <div key={s} className="flex flex-col items-center rounded-md py-2" style={{ background: 'hsl(22 10% 10%)' }}>
                <span className="font-display text-xs tracking-wide" style={{ color: 'hsl(38 14% 45%)' }}>{STAT_LABELS[s]}</span>
                <span className="font-display text-lg font-bold" style={{ color: 'hsl(38 28% 82%)' }}>{fs[s]}</span>
                <span className="text-xs" style={{ color: 'hsl(18 70% 52%)' }}>{modStr(fs[s])}</span>
              </div>
            ))}
          </div>

          {/* Background + skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-display tracking-widest mb-1.5" style={{ color: 'hsl(38 18% 48%)' }}>BACKGROUND</p>
              <p style={{ color: 'hsl(38 20% 65%)' }}>{draft.background} — {draft.alignment}</p>
              {bg && <p className="mt-1 italic" style={{ color: 'hsl(38 14% 46%)' }}>{bg.feature}</p>}
            </div>
            <div>
              <p className="font-display tracking-widest mb-1.5" style={{ color: 'hsl(38 18% 48%)' }}>SKILLS & SAVES</p>
              <p style={{ color: 'hsl(38 20% 65%)' }}>
                {[...new Set([...selectedClass.skills, ...(bg?.skills ?? [])])].join(', ')}
              </p>
              <p className="mt-1" style={{ color: 'hsl(38 14% 46%)' }}>Saves: {selectedClass.saves.join(', ')}</p>
            </div>
            <div>
              <p className="font-display tracking-widest mb-1.5" style={{ color: 'hsl(38 18% 48%)' }}>CLASS FEATURES</p>
              {selectedClass.features.map(f => (
                <p key={f} className="leading-5" style={{ color: 'hsl(38 20% 65%)' }}>• {f}</p>
              ))}
            </div>
            <div>
              <p className="font-display tracking-widest mb-1.5" style={{ color: 'hsl(38 18% 48%)' }}>EQUIPMENT</p>
              <p style={{ color: 'hsl(38 20% 65%)' }}>{selectedClass.equipment.join(' · ')}</p>
            </div>
            {(selectedClass.cantrips.length > 0 || selectedClass.spells.length > 0) && (
              <div className="md:col-span-2">
                <p className="font-display tracking-widest mb-1.5" style={{ color: 'hsl(255 40% 65%)' }}>SPELLS</p>
                {selectedClass.cantrips.length > 0 && <p style={{ color: 'hsl(38 20% 65%)' }}>Cantrips: {selectedClass.cantrips.join(', ')}</p>}
                {selectedClass.spells.length > 0 && <p style={{ color: 'hsl(38 20% 65%)' }}>Level 1 ({selectedClass.spellSlots} slots): {selectedClass.spells.join(', ')}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Start button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            onClick={handleStart}
            disabled={setupMutation.isPending}
            className="font-display tracking-widest px-12 py-6 text-base"
            style={{
              background: 'linear-gradient(135deg, hsl(18 90% 48%), hsl(0 72% 42%))',
              color: 'hsl(38 28% 94%)',
              border: '1px solid hsl(18 90% 55% / 0.6)',
              boxShadow: '0 0 28px hsl(18 90% 52% / 0.4)',
            }}
            data-testid="button-begin-adventure"
          >
            <Wand2 className="w-5 h-5 mr-2" />
            {setupMutation.isPending ? 'PREPARING YOUR ADVENTURE...' : 'BEGIN THE ADVENTURE'}
          </Button>
          <button
            onClick={() => setStep(1)}
            className="font-display text-xs tracking-widest transition-opacity hover:opacity-80"
            style={{ color: 'hsl(38 14% 38%)' }}
          >
            ← Start over
          </button>
        </div>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen stone-texture"
      style={{ background: 'hsl(20 10% 5%)' }}
      data-testid="character-create-page"
    >
      {/* Ambient top gradient */}
      <div
        className="fixed inset-x-0 top-0 h-1 pointer-events-none z-50"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(18 90% 52% / 0.6), hsl(42 88% 58% / 0.8), hsl(18 90% 52% / 0.6), transparent)' }}
      />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <StepHeader />

        {step === 1 && <Step1_Race />}
        {step === 2 && <Step2_Class />}
        {step === 3 && <Step3_AbilityScores />}
        {step === 4 && <Step4_Background />}
        {step === 5 && <Step5_Review />}
      </div>
    </div>
  );
}
