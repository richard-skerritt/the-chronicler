import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ── Character Data (custom-created characters) ──────────────────────────────
export interface CharacterData {
  name: string;
  race: string;
  class: string;
  level: number;
  hp: number;
  maxHp: number;
  ac: number;
  gold: number;
  // Ability scores (before racial bonuses applied)
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
  // Derived modifiers
  strMod: number; dexMod: number; conMod: number; intMod: number; wisMod: number; chaMod: number;
  background: string;
  skills: string[];
  spellSlots: number;
  maxSpellSlots: number;
  cantrips: string[];
  spells: string[];
  equipment: string[];
  features: string[];
  alignment: string;
  speed: number;
  hitDie: number;
  savingThrows: string[];
}

// ── Campaign table ────────────────────────────────────────────────────────────
export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default('Heroes of the Borderlands'),
  currentLocation: text('current_location').notNull().default('Cave A — Entrance'),

  // Gideon Quick-Finger (Halfling Rogue Level 1) — used in 'heroes' mode
  gideonHp: integer('gideon_hp').notNull().default(9),
  gideonMaxHp: integer('gideon_max_hp').notNull().default(9),
  gideonGold: integer('gideon_gold').notNull().default(33),

  // Zella Slut-Thorne (Human Wizard Level 1) — used in 'heroes' mode
  zellaHp: integer('zella_hp').notNull().default(7),
  zellaMaxHp: integer('zella_max_hp').notNull().default(7),
  zellaGold: integer('zella_gold').notNull().default(89),
  zellaSpellSlots: integer('zella_spell_slots').notNull().default(2),
  zellaMaxSpellSlots: integer('zella_max_spell_slots').notNull().default(2),

  // Party state
  partyLevel: integer('party_level').notNull().default(1),
  cavesCleared: text('caves_cleared').notNull().default('[]'),

  // Combat
  inCombat: integer('in_combat', { mode: 'boolean' }).notNull().default(false),
  combatState: text('combat_state').default(null),

  // Session notes
  sessionNotes: text('session_notes').default(''),

  // Custom characters — JSON CharacterData (null = not set)
  char1: text('char1').default(null),
  char2: text('char2').default(null),

  // 'heroes' = Gideon & Zella (default) | 'custom' = player-created characters
  gameMode: text('game_mode').notNull().default('heroes'),
});

// ── Messages table ────────────────────────────────────────────────────────────
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  timestamp: integer('timestamp').notNull(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true });
export const insertMessageSchema  = createInsertSchema(messages).omit({ id: true });

export type Campaign      = typeof campaigns.$inferSelect;
export type Message       = typeof messages.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertMessage  = z.infer<typeof insertMessageSchema>;

// ── Combat helpers ────────────────────────────────────────────────────────────
export interface CombatantState {
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  isPlayer: boolean;
  conditions?: string[];
}

export interface CombatState {
  round: number;
  currentTurn: number;
  combatants: CombatantState[];
}

// ── State update from AI ──────────────────────────────────────────────────────
export interface StateUpdate {
  // Heroes mode fields
  gideonHp?: number;
  gideonMaxHp?: number;
  gideonGold?: number;
  zellaHp?: number;
  zellaMaxHp?: number;
  zellaGold?: number;
  zellaSpellSlots?: number;
  zellaMaxSpellSlots?: number;
  // Custom char fields
  char1Hp?: number;
  char2Hp?: number;
  char1SpellSlots?: number;
  char2SpellSlots?: number;
  char1Gold?: number;
  char2Gold?: number;
  // Shared fields
  currentLocation?: string;
  cavesCleared?: string[];
  partyLevel?: number;
  inCombat?: boolean;
  combatState?: CombatState | null;
  sessionNotes?: string;
}
