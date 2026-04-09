#!/usr/bin/env python3
"""TTS helper — generates speech using ElevenLabs and returns base64-encoded MP3."""
import sys
import base64
import asyncio
sys.path.insert(0, '/home/user/workspace/skills/website-building/shared/llm-api')

async def main():
    text = sys.argv[1] if len(sys.argv) > 1 else "The adventure begins."
    voice = sys.argv[2] if len(sys.argv) > 2 else "george"  # deep, raspy British narrator
    
    try:
        from generate_audio import generate_audio
        audio_bytes = await generate_audio(text, voice=voice, model="elevenlabs_tts_v3")
        encoded = base64.b64encode(audio_bytes).decode('utf-8')
        print(encoded, end='')
    except Exception as e:
        sys.stderr.write(f"TTS error: {e}\n")
        sys.exit(1)

asyncio.run(main())
