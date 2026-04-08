/**
 * Text-to-Speech manager for The Chronicler
 * Supports: Browser Web Speech API · ElevenLabs TTS v3 · Speechify
 */

export type TTSVoice = 'browser' | 'elevenlabs' | 'speechify';

export interface TTSOptions {
  voice?: TTSVoice;
  voiceName?: string;       // ElevenLabs voice name (e.g. 'james', 'george')
  speechifyKey?: string;    // Speechify API key
  speechifyVoiceId?: string;// Speechify voice ID (e.g. 'john')
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;

export function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

export function isSpeaking(): boolean {
  return (
    (window.speechSynthesis?.speaking ?? false) ||
    (currentAudio != null && !currentAudio.paused)
  );
}

// Strip markdown/formatting symbols from text before speaking
function cleanTextForTTS(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
    .replace(/\*(.*?)\*/g, '$1')       // italic
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/⚔️|💰|✨|📍|🎲|🛡️|❤️|💜|🔥/g, '')
    .replace(/\[\[STATE:.*?:STATE\]\]/gs, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/---+/g, '.')  // horizontal rules → pause
    .replace(/\s+/g, ' ')
    .trim();
}

export async function speakText(text: string, options: TTSOptions = {}): Promise<void> {
  const {
    voice = 'elevenlabs',
    voiceName = 'james',
    speechifyKey = '',
    speechifyVoiceId = 'john',
    rate = 0.92,
    pitch = 0.88,
    volume = 1,
    onStart,
    onEnd,
    onError,
  } = options;

  stopSpeech();
  const cleanText = cleanTextForTTS(text);
  if (!cleanText) return;

  // ── Speechify ──────────────────────────────────────────────────────────────
  if (voice === 'speechify' && speechifyKey) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText.substring(0, 2000),
          provider: 'speechify',
          voice: speechifyVoiceId,
          speechifyKey,
        }),
      });
      const data = await res.json();
      if (data.audio) {
        playAudio(data.audio, { onStart, onEnd, onError, fallback: () =>
          speakWithBrowser(cleanText, { rate, pitch, volume, onStart, onEnd, onError })
        });
        return;
      }
    } catch {
      // fall through
    }
  }

  // ── ElevenLabs ─────────────────────────────────────────────────────────────
  if (voice === 'elevenlabs') {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText.substring(0, 2000),
          provider: 'elevenlabs',
          voice: voiceName,
        }),
      });
      const data = await res.json();
      if (data.audio) {
        playAudio(data.audio, { onStart, onEnd, onError, fallback: () =>
          speakWithBrowser(cleanText, { rate, pitch, volume, onStart, onEnd, onError })
        });
        return;
      }
    } catch {
      // fall through to browser TTS
    }
  }

  // ── Browser fallback ───────────────────────────────────────────────────────
  speakWithBrowser(cleanText, { rate, pitch, volume, onStart, onEnd, onError });
}

function playAudio(
  src: string,
  opts: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: string) => void;
    fallback?: () => void;
  }
) {
  const audio = new Audio(src);
  currentAudio = audio;
  audio.onplay = () => opts.onStart?.();
  audio.onended = () => {
    currentAudio = null;
    opts.onEnd?.();
  };
  audio.onerror = () => {
    currentAudio = null;
    if (opts.fallback) opts.fallback();
    else opts.onError?.('audio playback failed');
  };
  audio.play().catch(() => {
    currentAudio = null;
    if (opts.fallback) opts.fallback();
  });
}

function speakWithBrowser(
  text: string,
  options: { rate: number; pitch: number; volume: number; onStart?: () => void; onEnd?: () => void; onError?: (e: string) => void }
) {
  if (!window.speechSynthesis) {
    options.onError?.('Web Speech API not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  // Find the best voice — prefer UK English male for DM character
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find(v => v.name.toLowerCase().includes('uk') && v.name.toLowerCase().includes('male')) ||
    voices.find(v => v.name.toLowerCase().includes('google uk english male')) ||
    voices.find(v => v.lang === 'en-GB' && !v.name.toLowerCase().includes('female')) ||
    voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    null;

  if (preferredVoice) utterance.voice = preferredVoice;

  utterance.rate = options.rate;
  utterance.pitch = options.pitch;
  utterance.volume = options.volume;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (e) => options.onError?.(e.error);

  window.speechSynthesis.speak(utterance);
}

// Get available browser voices
export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}
