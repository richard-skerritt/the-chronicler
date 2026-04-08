import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Campaign state — one row per campaign
export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default('Heroes of the Borderlands'),
  currentLocation: text('current_location').notNull().default('Cave A — Entrance'),
  // Gideon Quick-Finger (Halfling Rogue Level 1)
  gideonHp: integer('gideon_hp').notNull().default(9),
  gideonMaxHp: integer('gideon_max_hp').notNull().default(9),
  gideonGold: integer('gideon_gold').notNull().default(33),
  // Zella Slut-Thorne (Human Wizard Level 1)
  zellaHp: integer('zella_hp').notNull().default(7),
  zellaMaxHp: integer('zella_max_hp').notNull().default(7),
  zellaGold: integer('zella_gold').notNull().default(89),
  zellaSpellSlots: integer('zella_spell_slots').notNull().default(2),
  zellaMaxSpellSlots: integer('zella_max_spell_slots').notNull().default(2),
  // Party state
  partyLevel: integer('party_level').notNull().default(1),
  cavesCleared: text('caves_cleared').notNull().default('[]'), // JSON array of cave letters
  // Combat
  inCombat: integer('in_combat', { mode: 'boolean' }).notNull().default(false),
  combatState: text('combat_state').default(null), // JSON: { round, initiative: [{name, hp, maxHp, ac, isPlayer}] }
  // Session notes (carried context)
  sessionNotes: text('session_notes').default(''),
});

// Conversation messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  timestamp: integer('timestamp').notNull(),
});

// Insert schemas
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });

export type Campaign = typeof campaigns.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Combat state type for convenience
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

// State update that AI can return
export interface StateUpdate {
  gideonHp?: number;
  gideonMaxHp?: number;
  gideonGold?: number;
  zellaHp?: number;
  zellaMaxHp?: number;
  zellaGold?: number;
  zellaSpellSlots?: number;
  zellaMaxSpellSlots?: number;
  currentLocation?: string;
  cavesCleared?: string[];
  partyLevel?: number;
  inCombat?: boolean;
  combatState?: CombatState | null;
  sessionNotes?: string;
}
