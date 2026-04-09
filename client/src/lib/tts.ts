/**
 * Text-to-Speech manager for The Chronicler
 *
 * Priority chain:
 *   1. ElevenLabs (client-side direct) — if elevenLabsApiKey provided
 *   2. Speechify (server proxy)        — if provider=speechify and speechifyKey provided
 *   3. Browser Web Speech API          — always-available fallback
 *
 * Autoplay strategy:
 *   Browsers block audio.play() in iframes until a user gesture.
 *   We unlock the AudioContext on any click/keypress, then autoplay works.
 *   If play() is blocked, audio is queued in pendingAudioSrc and replayed
 *   when touchAudioContext() is called (Send button, Enter key, speaker icon).
 */
import { API_BASE } from './queryClient';

export type TTSVoice = 'browser' | 'elevenlabs' | 'speechify';

// ElevenLabs premade voice IDs.
// If voiceName is NOT in this map, it's treated as a raw voice ID (for custom/cloned voices).
const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  george:  'JBFqnCBsd6RMkjVDRZzb', // raspy, British narrator
  james:   'ZQe5CZNOzWyzPSCn5a3c', // calm, Australian narrator
  daniel:  'onwK4e9ZLuTAKqWW03F9', // deep, British
  brian:   'nPczCjzI2devNBz1zQrb', // deep, American
  callum:  'N2lVS1w4EtoT3dr4eOWO', // hoarse, American
  harry:   'SOYHLrjzK2X1ezoPC6cr', // dramatic, American
  josh:    'TxGEqnHWrfWFTfGW9XjX', // deep, American
};

// Resolve voiceName to a voice ID: known alias → map, otherwise use as-is (custom ID)
export function resolveVoiceId(voiceName: string): string {
  return ELEVENLABS_VOICE_MAP[voiceName.toLowerCase()] ?? voiceName;
}

export interface TTSOptions {
  voice?: TTSVoice;
  voiceName?: string;           // ElevenLabs voice name (e.g. 'george')
  elevenLabsApiKey?: string;    // User's own ElevenLabs API key
  speechifyKey?: string;
  speechifyVoiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

let currentAudio: HTMLAudioElement | null = null;
let currentBlobUrl: string | null = null;
let pendingAudioSrc: string | null = null;
let audioUnlocked = false;

// ── Unlock audio context on first user gesture ────────────────────────────────
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    ctx.close();
  } catch {}
}

export function touchAudioContext() {
  unlockAudio();
  if (pendingAudioSrc) {
    const src = pendingAudioSrc;
    pendingAudioSrc = null;
    playAudioSrc(src, {});
  }
}

export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  pendingAudioSrc = null;
  window.speechSynthesis?.cancel();
}

export function isSpeaking(): boolean {
  return (currentAudio != null && !currentAudio.paused) || window.speechSynthesis?.speaking;
}

export function hasPendingAudio(): boolean {
  return pendingAudioSrc !== null;
}

// Strip markdown before speaking
function cleanText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/⚔️|💰|✨|📍|🎲|🛡️|❤️|💜|🔥|🕯️|👀|🤫/g, '')
    .replace(/\[\[STATE:.*?:STATE\]\]/gs, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/---+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function speakText(text: string, options: TTSOptions = {}): Promise<void> {
  const {
    voice = 'elevenlabs',
    voiceName = 'george',
    elevenLabsApiKey = '',
    speechifyKey = '',
    speechifyVoiceId = 'john',
    rate = 0.9,
    pitch = 0.8,
    volume = 1,
    onStart,
    onEnd,
    onError,
  } = options;

  stopSpeech();
  const clean = cleanText(text);
  if (!clean) return;

  // ── 1. ElevenLabs — via server proxy, returns raw MP3 binary ───────────────
  if (elevenLabsApiKey) {
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          provider: 'elevenlabs',
          voice: voiceName,
          elevenLabsKey: elevenLabsApiKey,
        }),
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('audio')) {
          // Binary MP3 response — create a blob URL and play
          const blob = await res.blob();
          const url  = URL.createObjectURL(blob);
          currentBlobUrl = url;
          playAudioSrc(url, { onStart, onEnd, onError });
          return;
        }
        // Legacy JSON path (Speechify / fallback)
        const data = await res.json() as { audio?: string | null };
        if (data.audio) {
          playAudioSrc(data.audio, { onStart, onEnd, onError });
          return;
        }
      }
      console.warn('ElevenLabs proxy failed:', res.status);
    } catch (e) {
      console.warn('ElevenLabs proxy error:', e);
    }
    // Fall through to browser TTS
  }

  // ── 2. Speechify — via server proxy ───────────────────────────────────────
  if (voice === 'speechify' && speechifyKey) {
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean.substring(0, 2000),
          provider: 'speechify',
          voice: speechifyVoiceId,
          speechifyKey,
        }),
      });
      const data = await res.json();
      if (data.audio) {
        playAudioSrc(data.audio, { onStart, onEnd, onError });
        return;
      }
    } catch (e) {
      console.warn('Speechify failed:', e);
    }
    // Speechify failed — fall through to browser TTS
  }

  // ── 3. Browser Web Speech API — always available fallback ─────────────────
  speakWithBrowser(clean, { rate, pitch, volume, onStart, onEnd, onError });
}

function playAudioSrc(
  src: string,
  opts: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: string) => void;
  }
) {
  const audio = new Audio(src);
  currentAudio = audio;

  audio.onplay    = () => opts.onStart?.();
  audio.onended   = () => {
    currentAudio = null;
    if (currentBlobUrl === src) {
      URL.revokeObjectURL(src);
      currentBlobUrl = null;
    }
    opts.onEnd?.();
  };
  audio.onerror   = () => {
    currentAudio = null;
    opts.onError?.('playback error');
    opts.onEnd?.();
  };

  audio.play().catch((err) => {
    // Autoplay blocked — queue for replay on next user gesture
    console.warn('Autoplay blocked, queuing audio:', err.message);
    currentAudio = null;
    pendingAudioSrc = src;
    opts.onStart?.();
    // Don't call onEnd — audio is pending, fires when played via touchAudioContext()
  });
}

export function speakWithBrowser(
  text: string,
  options: { rate: number; pitch: number; volume: number; onStart?: () => void; onEnd?: () => void; onError?: (e: string) => void }
) {
  if (!window.speechSynthesis) {
    options.onError?.('Web Speech API not supported');
    options.onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  // Best available deep male voice
  const tryLoadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    return (
      voices.find(v => v.name === 'Google UK English Male') ||
      voices.find(v => v.name.toLowerCase().includes('microsoft david')) ||
      voices.find(v => v.name.toLowerCase().includes('microsoft mark')) ||
      voices.find(v => v.lang === 'en-GB' && !v.name.toLowerCase().includes('female') && !v.name.toLowerCase().includes('zira') && !v.name.toLowerCase().includes('hazel')) ||
      voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female') && !v.name.toLowerCase().includes('zira') && !v.name.toLowerCase().includes('samantha')) ||
      null
    );
  };

  const voice = tryLoadVoices();
  if (voice) utterance.voice = voice;

  utterance.rate   = options.rate;
  utterance.pitch  = options.pitch;
  utterance.volume = options.volume;
  utterance.onstart = () => options.onStart?.();
  utterance.onend   = () => options.onEnd?.();
  utterance.onerror = (e) => options.onError?.(e.error);

  // Chrome sometimes needs a small delay before speaking
  setTimeout(() => window.speechSynthesis.speak(utterance), 50);
}

export function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}
