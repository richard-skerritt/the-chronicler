import type { Express } from 'express';
import type { Server } from 'http';
import Anthropic from '@anthropic-ai/sdk';
import { storage } from './storage';
import { buildSystemPrompt } from './systemPrompt';
import type { StateUpdate } from '@shared/schema';

const client = new Anthropic();

// Extract state update JSON from AI response if present
function extractStateUpdate(content: string): StateUpdate | null {
  const match = content.match(/\[\[STATE:(.*?):STATE\]\]/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Strip state update markers from display content
function cleanContent(content: string): string {
  return content.replace(/\[\[STATE:.*?:STATE\]\]/s, '').trim();
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // Get campaign state
  app.get('/api/campaign', (req, res) => {
    try {
      const campaign = storage.getOrCreateDefaultCampaign();
      res.json(campaign);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  });

  // Update campaign state
  app.patch('/api/campaign/:id', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = storage.updateCampaign(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  // Reset campaign (new session from same starting point)
  app.post('/api/campaign/reset', (req, res) => {
    try {
      const campaign = storage.getOrCreateDefaultCampaign();
      storage.clearMessages(campaign.id);
      const updated = storage.updateCampaign(campaign.id, {
        gideonHp: campaign.gideonMaxHp,
        zellaHp: campaign.zellaMaxHp,
        zellaSpellSlots: campaign.zellaMaxSpellSlots,
        inCombat: false,
        combatState: null,
        sessionNotes: '',
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset' });
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

  // Main chat endpoint — send player action, receive DM response
  app.post('/api/chat', async (req, res) => {
    const { message, campaignId } = req.body;
    if (!message || !campaignId) {
      return res.status(400).json({ error: 'message and campaignId required' });
    }

    try {
      // Get campaign state
      const campaign = storage.getCampaign(campaignId);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

      // Save player message
      const now = Date.now();
      storage.addMessage({ campaignId, role: 'user', content: message, timestamp: now });

      // Build conversation history (last 30 messages)
      const history = storage.getMessages(campaignId, 30);
      const anthropicMessages = history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // If the last message in history is the one we just added (same content), 
      // don't duplicate it
      const messagesForApi = anthropicMessages;

      // Build system prompt with current state
      const systemPrompt = buildSystemPrompt(campaign);

      // Stream response from Claude
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: messagesForApi,
      });

      stream.on('text', (text) => {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
      });

      stream.on('message', async (msg) => {
        // Extract state update if present
        const stateUpdate = extractStateUpdate(fullResponse);
        const cleanedResponse = cleanContent(fullResponse);

        // Save assistant message (cleaned)
        storage.addMessage({
          campaignId,
          role: 'assistant',
          content: cleanedResponse,
          timestamp: Date.now(),
        });

        // Apply state update if the AI included one
        if (stateUpdate) {
          const updateData: Partial<typeof campaign> = {};
          if (stateUpdate.gideonHp !== undefined) updateData.gideonHp = stateUpdate.gideonHp;
          if (stateUpdate.gideonMaxHp !== undefined) updateData.gideonMaxHp = stateUpdate.gideonMaxHp;
          if (stateUpdate.gideonGold !== undefined) updateData.gideonGold = stateUpdate.gideonGold;
          if (stateUpdate.zellaHp !== undefined) updateData.zellaHp = stateUpdate.zellaHp;
          if (stateUpdate.zellaMaxHp !== undefined) updateData.zellaMaxHp = stateUpdate.zellaMaxHp;
          if (stateUpdate.zellaGold !== undefined) updateData.zellaGold = stateUpdate.zellaGold;
          if (stateUpdate.zellaSpellSlots !== undefined) updateData.zellaSpellSlots = stateUpdate.zellaSpellSlots;
          if (stateUpdate.currentLocation !== undefined) updateData.currentLocation = stateUpdate.currentLocation;
          if (stateUpdate.cavesCleared !== undefined) updateData.cavesCleared = JSON.stringify(stateUpdate.cavesCleared);
          if (stateUpdate.partyLevel !== undefined) updateData.partyLevel = stateUpdate.partyLevel;
          if (stateUpdate.inCombat !== undefined) updateData.inCombat = stateUpdate.inCombat;
          if (stateUpdate.combatState !== undefined) updateData.combatState = stateUpdate.combatState ? JSON.stringify(stateUpdate.combatState) : null;
          if (Object.keys(updateData).length > 0) {
            storage.updateCampaign(campaignId, updateData);
          }
        }

        // Send final state
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
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to get DM response' });
      }
    }
  });

  // Manual state update (for player-initiated changes like spending gold, resting, etc.)
  app.post('/api/campaign/:id/update-state', (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stateUpdate } = req.body as { stateUpdate: StateUpdate };
      const updateData: Record<string, unknown> = {};

      if (stateUpdate.gideonHp !== undefined) updateData.gideonHp = stateUpdate.gideonHp;
      if (stateUpdate.gideonMaxHp !== undefined) updateData.gideonMaxHp = stateUpdate.gideonMaxHp;
      if (stateUpdate.gideonGold !== undefined) updateData.gideonGold = stateUpdate.gideonGold;
      if (stateUpdate.zellaHp !== undefined) updateData.zellaHp = stateUpdate.zellaHp;
      if (stateUpdate.zellaMaxHp !== undefined) updateData.zellaMaxHp = stateUpdate.zellaMaxHp;
      if (stateUpdate.zellaGold !== undefined) updateData.zellaGold = stateUpdate.zellaGold;
      if (stateUpdate.zellaSpellSlots !== undefined) updateData.zellaSpellSlots = stateUpdate.zellaSpellSlots;
      if (stateUpdate.currentLocation !== undefined) updateData.currentLocation = stateUpdate.currentLocation;
      if (stateUpdate.cavesCleared !== undefined) updateData.cavesCleared = JSON.stringify(stateUpdate.cavesCleared);
      if (stateUpdate.partyLevel !== undefined) updateData.partyLevel = stateUpdate.partyLevel;
      if (stateUpdate.inCombat !== undefined) updateData.inCombat = stateUpdate.inCombat;
      if (stateUpdate.combatState !== undefined) updateData.combatState = stateUpdate.combatState ? JSON.stringify(stateUpdate.combatState) : null;

      const updated = storage.updateCampaign(id, updateData);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update state' });
    }
  });

  // TTS endpoint — generate speech from text using ElevenLabs
  app.post('/api/tts', async (req, res) => {
    const { text, voice = 'george' } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const fs = await import('fs');
      const path = await import('path');

      const scriptPath = path.join(process.cwd(), 'server', 'tts_helper.py');
      const { stdout } = await execFileAsync('python3', [scriptPath, text.substring(0, 2000), voice]);
      
      // stdout is base64-encoded audio
      const audioBase64 = stdout.trim();
      res.json({ audio: `data:audio/mpeg;base64,${audioBase64}` });
    } catch (err) {
      console.error('TTS error:', err);
      // Return empty so client falls back to Web Speech API
      res.json({ audio: null, fallback: true });
    }
  });
}
