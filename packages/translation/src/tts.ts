/**
 * Text-to-Speech using ElevenLabs
 * https://elevenlabs.io/docs/api-reference/text-to-speech
 * 
 * Features:
 * - Flash v2.5: ~75ms latency (use for real-time)
 * - Multilingual v2: Best quality (use for pre-rendered)
 * - Voice cloning support (Tim's voice in all languages!)
 * - 32 languages supported
 */

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Tim's voice ID - primary voice for TourLingo
const TIM_VOICE_ID = '2pwMUCWPsm9t6AwXYaCj';

// Default voices
const DEFAULT_VOICES: Record<string, string> = {
  male: TIM_VOICE_ID, // Tim - Magnetic Island Guide
  female: 'EXAVITQu4vr4xnSDxMaL', // Bella - friendly, clear (fallback)
};

// Language-specific voice IDs (optional - for better accent matching)
// Set these in .env for best results, defaults to Tim's voice
const LANGUAGE_VOICE_MAP: Record<string, string> = {
  en: process.env.ELEVENLABS_VOICE_EN || TIM_VOICE_ID,
  de: process.env.ELEVENLABS_VOICE_DE || TIM_VOICE_ID,
  ja: process.env.ELEVENLABS_VOICE_JA || TIM_VOICE_ID,
  zh: process.env.ELEVENLABS_VOICE_ZH || TIM_VOICE_ID,
  ko: process.env.ELEVENLABS_VOICE_KO || TIM_VOICE_ID,
  fr: process.env.ELEVENLABS_VOICE_FR || TIM_VOICE_ID,
  es: process.env.ELEVENLABS_VOICE_ES || TIM_VOICE_ID,
  it: process.env.ELEVENLABS_VOICE_IT || TIM_VOICE_ID,
  pt: process.env.ELEVENLABS_VOICE_PT || TIM_VOICE_ID,
  nl: process.env.ELEVENLABS_VOICE_NL || TIM_VOICE_ID,
};

export interface TTSOptions {
  language: string;
  voiceId?: string; // Override voice ID
  useOperatorVoice?: boolean; // Use Tim's cloned voice
  model?: 'flash' | 'multilingual'; // flash = low latency, multilingual = best quality
  stability?: number; // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
  style?: number; // 0-1, default 0
}

/**
 * Synthesize speech and return audio as base64 data URL
 */
export async function synthesizeSpeech(
  text: string,
  language: string,
  options?: Partial<TTSOptions>
): Promise<string> {
  const audioBuffer = await synthesizeSpeechBuffer(text, language, options);
  const base64 = bufferToBase64(audioBuffer);
  return `data:audio/mp3;base64,${base64}`;
}

/**
 * Synthesize speech and return as ArrayBuffer
 */
export async function synthesizeSpeechBuffer(
  text: string,
  language: string,
  options?: Partial<TTSOptions>
): Promise<ArrayBuffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  // Determine which voice to use
  let voiceId: string;
  
  if (options?.voiceId) {
    // Explicit voice ID provided
    voiceId = options.voiceId;
  } else if (options?.useOperatorVoice && process.env.ELEVENLABS_OPERATOR_VOICE_ID) {
    // Use Tim's cloned voice
    voiceId = process.env.ELEVENLABS_OPERATOR_VOICE_ID;
  } else {
    // Use language-specific or default voice
    voiceId = LANGUAGE_VOICE_MAP[language] || DEFAULT_VOICES.male;
  }

  // Select model based on latency needs
  const modelId = options?.model === 'flash' 
    ? 'eleven_flash_v2_5' 
    : 'eleven_multilingual_v2';

  const endpoint = `${ELEVENLABS_TTS_URL}/${voiceId}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarityBoost ?? 0.75,
        style: options?.style ?? 0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS error: ${error}`);
  }

  return response.arrayBuffer();
}

/**
 * Stream TTS audio (for real-time playback)
 * Returns a readable stream of audio chunks
 */
export async function synthesizeSpeechStream(
  text: string,
  language: string,
  options?: Partial<TTSOptions>
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  let voiceId: string;
  
  if (options?.voiceId) {
    voiceId = options.voiceId;
  } else if (options?.useOperatorVoice && process.env.ELEVENLABS_OPERATOR_VOICE_ID) {
    voiceId = process.env.ELEVENLABS_OPERATOR_VOICE_ID;
  } else {
    voiceId = LANGUAGE_VOICE_MAP[language] || DEFAULT_VOICES.male;
  }

  // Always use Flash for streaming - optimized for low latency
  const modelId = 'eleven_flash_v2_5';

  const endpoint = `${ELEVENLABS_TTS_URL}/${voiceId}/stream`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarityBoost ?? 0.75,
        style: options?.style ?? 0,
        use_speaker_boost: true,
      },
      optimize_streaming_latency: 3, // Max latency optimization
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS streaming error: ${error}`);
  }

  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  return response.body;
}

/**
 * Get or create a cloned voice from audio samples
 * Use this to create Tim's voice clone
 */
export async function cloneVoice(
  name: string,
  audioSamples: Blob[],
  description?: string
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const formData = new FormData();
  formData.append('name', name);
  
  if (description) {
    formData.append('description', description);
  }

  // Add audio samples (up to 25 samples, 30 seconds each)
  audioSamples.forEach((sample, index) => {
    formData.append('files', sample, `sample_${index}.mp3`);
  });

  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs voice cloning error: ${error}`);
  }

  const data = await response.json();
  return data.voice_id;
}

/**
 * List available voices
 */
export async function listVoices(): Promise<Array<{
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs list voices error: ${error}`);
  }

  const data = await response.json();
  return data.voices;
}

// Helpers

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
