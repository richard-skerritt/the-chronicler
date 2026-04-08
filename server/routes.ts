import type { Express } from 'express';
import type { Server } from 'http'  ;
import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { buildSystemPrompt } from './systemPrompt';
import type { StateUpdate, CharacterData } from '@shared/schema';

const client = new Anthropic();

// Extract state update JSON from AI response if present
function extractStateUpdate(content: string): StateUpdate | null {
  const match = content.match(/\[\[STATE:(.*?):STATE\]\]/s);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

// Strip state update markers from display content
function cleanContent(content: string): string {
  return content.replace(/\[\[STATE:.*?:STATE\]\]/s, '').trim();
}

// Apply a StateUpdate object to a campaign in the DB
function applyStateUpdate(campaignId: number, stateUpdate: StateUpdate, existingCampaign: Record<string, unknown>) {
  const u: Record<string, unknown> = {};
  if (stateUpdate.gideonHp          !== undefined) u.gideonHp          = stateUpdate.gideonHp;
  if (stateUpdate.gideonMaxHp       !== undefined) u.gideonMaxHp       = stateUpdate.gideonMaxHp;
  if (stateUpdate.gideonGold        !== undefined) u.gideonGold        = stateUpdate.gideonGold;
  if (stateUpdate.zellaHp           !== undefined) u.zellaHp           = stateUpdate.zellaHp;
  if (stateUpdate.zellaMaxHp        !== undefined) u.zellaMaxHp        = stateUpdate.zellaMaxHp;
  if (stateUpdate.zellaGold         !== undefined) u.zellaGold         = stateUpdate.zellaGold;
  if (stateUpdate.zellaSpellSlots   !== undefined) u.zellaSpellSlots   = stateUpdate.zellaSpellSlots;
  if (stateUpdate.currentLocation   !== undefined) u.currentLocation   = stateUpdate.currentLocation;
  if (stateUpdate.cavesCleared      !== undefined) u.cavesCleared      = JSON.stringify(stateUpdate.cavesCleared);
  if (stateUpdate.partyLevel        !== undefined) u.partyLevel        = stateUpdate.partyLevel;
  if (stateUpdate.inCombat          !== undefined) u.inCombat          = stateUpdate.inCombat;
  if (stateUpdate.sessionNotes      !== undefined) u.sessionNotes      = stateUpdate.sessionNotes;
  if (stateUpdate.combatState       !== undefined) u.combatState       = stateUpdate.combatState ? JSON.stringify(stateUpdate.combatState) : null;

  // Custom character HP / spell slots — patch the JSON blob
  if (stateUpdate.char1Hp !== undefined || stateUpdate.char1SpellSlots !== undefined || stateUpdate.char1Gold !== undefined) {
    const raw = existingCampaign.char1 as string | null;
    if (raw) {
      try {
        const c: CharacterData = JSON.parse(raw);
        if (stateUpdate.char1Hp !== undefined)         c.hp          = stateUpdate.char1Hp;
        if (stateUpdate.char1SpellSlots !== undefined) c.spellSlots  = stateUpdate.char1SpellSlots;
        if (stateUpdate.char1Gold !== undefined)       c.gold        = stateUpdate.char1Gold;
        u.char1 = JSON.stringify(c);
      } catch {}
    }
  }
  if (stateUpdate.char2Hp !== undefined || stateUpdate.char2SpellSlots !== undefined || stateUpdate.char2Gold !== undefined) {
    const raw = existingCampaign.char2 as string | null;
    if (raw) {
      try {
        const c: CharacterData = JSON.parse(raw);
        if (stateUpdate.char2Hp !== undefined)         c.hp          = stateUpdate.char2Hp;
        if (stateUpdate.char2SpellSlots !== undefined) c.spellSlots  = stateUpdate.char2SpellSlots;
        if (stateUpdate.char2Gold !== undefined)       c.gold        = stateUpdate.char2Gold;
        u.char2 = JSON.stringify(c);
      } catch {}
    }
  }

  if (Object.keys(u).length > 0) storage.updateCampaign(campaignId, u);
}

export async function registerRoutes(httpServer: Server, app: Express) {

  // ── Campaign state ────────────────────────────────────────────────────────
  app.get('/api/campaign', (req, res) => {
    try {
      const campaign = storage.getOrCreateDefaultCampaign();
      res.json(campaign);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  });

  app.patch('/api/campaign/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = storage.updateCampaign(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  // Reset session — restore HP/slots for the same characters, clear chat
  app.post('/api/campaign/reset', (req, res) => {
    try {
      const campaign = storage.getOrCreateDefaultCampaign();
      storage.clearMessages(campaign.id);

      const updateData: Record<string, unknown> = {
        gideonHp:      campaign.gideonMaxHp,
        zellaHp:       campaign.zellaMaxHp,
        zellaSpellSlots: campaign.zellaMaxSpellSlots,
        inCombat:      false,
        combatState:   null,
        sessionNotes:  '',
      };

      // Restore custom character HP/slots if in custom mode
      if (campaign.gameMode === 'custom') {
        if (campaign.char1) {
          try {
            const c: CharacterData = JSON.parse(campaign.char1);
            c.hp = c.maxHp;
            c.spellSlots = c.maxSpellSlots;
            updateData.char1 = JSON.stringify(c);
          } catch {}
        }
        if (campaign.char2) {
          try {
            const c: CharacterData = JSON.parse(campaign.char2);
            c.hp = c.maxHp;
            c.spellSlots = c.maxSpellSlots;
            updateData.char2 = JSON.stringify(c);
          } catch {}
        }
      }

      const updated = storage.updateCampaign(campaign.id, updateData);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset' });
    }
  });

  // New Game — wipes everything, ready for character creation
  app.post('/api/campaign/new-game', (req, res) => {
    try {
      const campaign = storage.getOrCreateDefaultCampaign();
      storage.clearMessages(campaign.id);
      const updated = storage.updateCampaign(campaign.id, {
        // Reset Heroes stats
        gideonHp: 9, gideonMaxHp: 9, gideonGold: 33,
        zellaHp: 7, zellaMaxHp: 7, zellaGold: 89,
        zellaSpellSlots: 2, zellaMaxSpellSlots: 2,
        // Reset party
        partyLevel: 1,
        cavesCleared: '[]',
        currentLocation: 'Cave A — Entrance',
        inCombat: false,
        combatState: null,
        sessionNotes: '',
        // Clear custom characters
        char1: null,
        char2: null,
        gameMode: 'heroes',
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to start new game' });
    }
  });

  // Setup custom characters after character creation
  app.post('/api/campaign/setup', (req, res) => {
    try {
      const { char1, char2 } = req.body as { char1: CharacterData; char2?: CharacterData };
      if (!char1) return res.status(400).json({ error: 'char1 required' });

      const campaign = storage.getOrCreateDefaultCampaign();
      storage.clearMessages(campaign.id);

      const updated = storage.updateCampaign(campaign.id, {
        char1: JSON.stringify(char1),
        char2: char2 ? JSON.stringify(char2) : null,
        gameMode: 'custom',
        partyLevel: 1,
        cavesCleared: '[]',
        currentLocation: 'The Adventure Begins',
        inCombat: false,
        combatState: null,
        sessionNotes: '',
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to setup campaign' });
    }
  });

  // Get message history
  app.get('/api/messages/:campaignId', (req, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      const msgs = storage.getMessages(campaignId, 60);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  // Main chat endpoint — player action → DM response (streaming SSE)
  app.post('/api/chat', async (req, res) => {
    const { message, campaignId } = req.body;
    if (!message || !campaignId) {
      return res.status(400).json({ error: 'message and campaignId required' });
    }

    try {
      const campaign = storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      const now = Date.now();
      storage.addMessage({ campaignId, role: 'user', content: message, timestamp: now });

      const history = storage.getMessages(campaignId, 30);
      const anthropicMessages = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const systemPrompt = buildSystemPrompt(campaign);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      stream.on('text', (text) => {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      });

      stream.on('message', async () => {
        const stateUpdate = extractStateUpdate(fullResponse);
        const cleanedResponse = cleanContent(fullResponse);

        storage.addMessage({
          campaignId,
          role: 'assistant',
          content: cleanedResponse,
          timestamp: Date.now(),
        });

        if (stateUpdate) {
          applyStateUpdate(campaignId, stateUpdate, campaign as unknown as Record<string, unknown>);
        }

        const updatedCampaign = storage.getCampaign(campaignId);
        res.write(`data: ${JSON.stringify({ type: 'done', campaign: updatedCampaign })}\n\n`);
        res.end();
      });

      stream.on('error', (err) => {
        console.error('Stream error:', err);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
        res.end();
      });

    } catch (err) {
      console.error('Chat error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to get DM response' });
    }
  });

  // Manual state update
  app.post('/api/campaign/:id/update-state', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stateUpdate } = req.body as { stateUpdate: StateUpdate };
      const existing = storage.getCampaign(id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      applyStateUpdate(id, stateUpdate, existing as unknown as Record<string, unknown>);
      const updated = storage.getCampaign(id);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update state' });
    }
  });

  // TTS endpoint — ElevenLabs or Speechify
  app.post('/api/tts', async (req, res) => {
    const { text, voice = 'james', provider = 'elevenlabs', speechifyKey } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    // ── Speechify ────────────────────────────────────────────────────────────
    if (provider === 'speechify' && speechifyKey) {
      try {
        const sfRes = await fetch('https://api.sws.speechify.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${speechifyKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text.substring(0, 3000),
            voice_id: voice,
            model: 'simba-english',
            audio_format: 'mp3',
          }),
        });
        if (sfRes.ok) {
          const buf = await sfRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          return res.json({ audio: `data:audio/mpeg;base64,${b64}` });
        }
        console.error('Speechify error:', sfRes.status, await sfRes.text().catch(() => ''));
      } catch (err) {
        console.error('Speechify request failed:', err);
      }
      return res.json({ audio: null, fallback: true });
    }

    // ── ElevenLabs (via Python helper) ───────────────────────────────────────
    try {
      const { execFile } = await import('child_process');
      const { promisify }  = await import('util');
      const path           = await import('path');
      const execFileAsync  = promisify(execFile);

      const scriptPath = path.join(process.cwd(), 'server', 'tts_helper.py');
      const { stdout } = await execFileAsync('python3', [scriptPath, text.substring(0, 2000), voice], {
        timeout: 30000,
      });

      res.json({ audio: `data:audio/mpeg;base64,${stdout.trim()}` });
    } catch (err) {
      console.error('TTS error:', err);
      res.json({ audio: null, fallback: true });
    }
  });
}
