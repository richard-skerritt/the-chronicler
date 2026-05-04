/**
 * Voice preference store — persists to localStorage so settings survive page reloads.
 * Falls back gracefully if localStorage is unavailable (e.g. private-browsing restrictions).
 * Env vars (VITE_ELEVENLABS_API_KEY / VITE_ELEVENLABS_VOICE_ID) act as compile-time defaults
 * but are always overridden by whatever the user last saved in Settings.
 */

export interface VoicePrefs {
  elevenLabsApiKey: string;
  voiceName: string;
}

const STORAGE_KEY = 'chronicler_voice_prefs';

function loadStored(): Partial<VoicePrefs> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<VoicePrefs>;
  } catch {}
  return {};
}

function saveStored(p: VoicePrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

const stored = loadStored();

const prefs: VoicePrefs = {
  elevenLabsApiKey: stored.elevenLabsApiKey ?? import.meta.env.VITE_ELEVENLABS_API_KEY ?? '',
  voiceName:        stored.voiceName        ?? import.meta.env.VITE_ELEVENLABS_VOICE_ID ?? 'george',
};

export const Prefs = {
  get voice(): VoicePrefs { return { ...prefs }; },
  setElevenLabsApiKey(k: string) { prefs.elevenLabsApiKey = k; saveStored(prefs); },
  setVoiceName(v: string)        { prefs.voiceName = v;        saveStored(prefs); },
};

export type VoiceProvider = 'elevenlabs';
