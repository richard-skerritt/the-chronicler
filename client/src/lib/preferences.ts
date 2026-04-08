/**
 * In-memory preference store (session-scoped).
 * localStorage/sessionStorage are blocked in iframes — this singleton persists for the session.
 */

export type VoiceProvider = 'browser' | 'elevenlabs' | 'speechify';

export interface VoicePrefs {
  provider: VoiceProvider;
  elevenLabsVoice: string;
  speechifyKey: string;
  speechifyVoiceId: string;
}

const prefs: VoicePrefs = {
  provider: 'elevenlabs',
  elevenLabsVoice: 'james',
  speechifyKey: '',
  speechifyVoiceId: 'john',
};

export const Prefs = {
  get voice(): VoicePrefs { return { ...prefs }; },
  setProvider(p: VoiceProvider) { prefs.provider = p; },
  setElevenLabsVoice(v: string) { prefs.elevenLabsVoice = v; },
  setSpeechifyKey(k: string) { prefs.speechifyKey = k; },
  setSpeechifyVoiceId(v: string) { prefs.speechifyVoiceId = v; },
};
