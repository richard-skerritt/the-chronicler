import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@shared/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

const sqlite = new Database('chronicler.db');
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Heroes of the Borderlands',
    current_location TEXT NOT NULL DEFAULT 'Cave A — Entrance',
    gideon_hp INTEGER NOT NULL DEFAULT 9,
    gideon_max_hp INTEGER NOT NULL DEFAULT 9,
    gideon_gold INTEGER NOT NULL DEFAULT 33,
    zella_hp INTEGER NOT NULL DEFAULT 7,
    zella_max_hp INTEGER NOT NULL DEFAULT 7,
    zella_gold INTEGER NOT NULL DEFAULT 89,
    zella_spell_slots INTEGER NOT NULL DEFAULT 2,
    zella_max_spell_slots INTEGER NOT NULL DEFAULT 2,
    party_level INTEGER NOT NULL DEFAULT 1,
    caves_cleared TEXT NOT NULL DEFAULT '[]',
    in_combat INTEGER NOT NULL DEFAULT 0,
    combat_state TEXT DEFAULT NULL,
    session_notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

// Add new columns if they don't exist (safe migration)
const colMigrations = [
  `ALTER TABLE campaigns ADD COLUMN char1 TEXT DEFAULT NULL`,
  `ALTER TABLE campaigns ADD COLUMN char2 TEXT DEFAULT NULL`,
  `ALTER TABLE campaigns ADD COLUMN game_mode TEXT NOT NULL DEFAULT 'heroes'`,
];
for (const sql of colMigrations) {
  try { sqlite.exec(sql); } catch { /* column already exists */ }
}
