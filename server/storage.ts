import { db } from './db';
import { campaigns, messages, type Campaign, type Message, type InsertCampaign, type InsertMessage } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export interface IStorage {
  // Campaign
  getCampaign(id: number): Campaign | undefined;
  getOrCreateDefaultCampaign(): Campaign;
  updateCampaign(id: number, data: Partial<InsertCampaign>): Campaign | undefined;
  // Messages
  getMessages(campaignId: number, limit?: number): Message[];
  addMessage(msg: InsertMessage): Message;
  clearMessages(campaignId: number): void;
}

export class Storage implements IStorage {
  getCampaign(id: number): Campaign | undefined {
    return db.select().from(campaigns).where(eq(campaigns.id, id)).get();
  }

  getOrCreateDefaultCampaign(): Campaign {
    const existing = db.select().from(campaigns).get();
    if (existing) return existing;
    return db.insert(campaigns).values({
      name: 'Heroes of the Borderlands',
      currentLocation: 'Cave A — Entrance',
      gideonHp: 9,
      gideonMaxHp: 9,
      gideonGold: 33,
      zellaHp: 7,
      zellaMaxHp: 7,
      zellaGold: 89,
      zellaSpellSlots: 2,
      zellaMaxSpellSlots: 2,
      partyLevel: 1,
      cavesCleared: '[]',
      inCombat: false,
      combatState: null,
      sessionNotes: '',
    }).returning().get();
  }

  updateCampaign(id: number, data: Partial<InsertCampaign>): Campaign | undefined {
    return db.update(campaigns).set(data).where(eq(campaigns.id, id)).returning().get();
  }

  getMessages(campaignId: number, limit = 40): Message[] {
    const rows = db
      .select()
      .from(messages)
      .where(eq(messages.campaignId, campaignId))
      .orderBy(desc(messages.id))
      .limit(limit)
      .all();
    return rows.reverse();
  }

  addMessage(msg: InsertMessage): Message {
    return db.insert(messages).values(msg).returning().get();
  }

  clearMessages(campaignId: number): void {
    db.delete(messages).where(eq(messages.campaignId, campaignId)).run();
  }
}

export const storage = new Storage();
