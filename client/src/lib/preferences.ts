/**
 * In-memory preference store (session-scoped).
 * localStorage/sessionStorage are blocked in iframes — this singleton persists for the session.
 */

export interface VoicePrefs {
  elevenLabsApiKey: string;   // User's own ElevenLabs key (free tier works)
  voiceName: string;          // Known name ('george', 'harry', etc.) OR a raw ElevenLabs voice ID
}

// To use your own ElevenLabs voice, enter your API key in Settings → Narrator Voice
// or set VITE_ELEVENLABS_API_KEY in your .env file.
const prefs: VoicePrefs = {
  elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
  voiceName: import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'george',
};

export const Prefs = {
  get voice(): VoicePrefs { return { ...prefs }; },
  setElevenLabsApiKey(k: string) { prefs.elevenLabsApiKey = k; },
  setVoiceName(v: string)        { prefs.voiceName = v; },
};

// Legacy shim — keep VoiceProvider type so existing imports don't break
export type VoiceProvider = 'elevenlabs';
