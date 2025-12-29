/**
 * Speech-to-Text using ElevenLabs Scribe v2
 * https://elevenlabs.io/docs/api-reference/speech-to-text
 * 
 * Features:
 * - ~150ms latency with Scribe v2 Realtime
 * - 90+ language support
 * - High accuracy across accents
 */

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

interface ElevenLabsSTTResponse {
  text: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language_code?: string;
  language_probability?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  detectedLanguage?: string;
}

/**
 * Transcribe audio blob to text using ElevenLabs Scribe
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language: string = 'en'
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('model_id', 'scribe_v1'); // Use scribe_v1 for file-based, v2 for realtime
  
  // Optional: specify language for better accuracy
  if (language) {
    formData.append('language_code', mapLanguageCode(language));
  }

  const response = await fetch(ELEVENLABS_STT_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs STT error: ${error}`);
  }

  const data: ElevenLabsSTTResponse = await response.json();
  return data.text || '';
}

/**
 * Transcribe audio with detailed results
 */
export async function transcribeAudioDetailed(
  audioBlob: Blob,
  language: string = 'en'
): Promise<TranscriptionResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');
  formData.append('model_id', 'scribe_v1');
  formData.append('tag_audio_events', 'true');
  
  if (language) {
    formData.append('language_code', mapLanguageCode(language));
  }

  const response = await fetch(ELEVENLABS_STT_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs STT error: ${error}`);
  }

  const data: ElevenLabsSTTResponse = await response.json();

  return {
    text: data.text || '',
    confidence: data.language_probability || 1,
    words: data.words?.map((w) => ({
      word: w.text,
      start: w.start,
      end: w.end,
    })),
    detectedLanguage: data.language_code,
  };
}

/**
 * Create WebSocket connection for real-time STT (Scribe v2 Realtime)
 * Use this for live audio streaming
 */
export function createRealtimeSTTConnection(options: {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  language?: string;
}): {
  send: (audioChunk: ArrayBuffer) => void;
  close: () => void;
  commit: () => void;
} {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const wsUrl = new URL('wss://api.elevenlabs.io/v1/speech-to-text/realtime');
  wsUrl.searchParams.set('model_id', 'scribe_v2_realtime');
  
  if (options.language) {
    wsUrl.searchParams.set('language_code', mapLanguageCode(options.language));
  }

  const ws = new WebSocket(wsUrl.toString(), {
    // @ts-ignore - headers for WebSocket
    headers: {
      'xi-api-key': apiKey,
    },
  });

  ws.onopen = () => {
    console.log('ElevenLabs STT WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'transcript') {
        options.onTranscript(data.text, data.is_final || false);
      }
    } catch (error) {
      console.error('Error parsing STT message:', error);
    }
  };

  ws.onerror = (event) => {
    options.onError(new Error('WebSocket error'));
  };

  ws.onclose = () => {
    console.log('ElevenLabs STT WebSocket closed');
  };

  return {
    send: (audioChunk: ArrayBuffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(audioChunk);
      }
    },
    close: () => {
      ws.close();
    },
    commit: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'commit' }));
      }
    },
  };
}

/**
 * Map our language codes to ElevenLabs format
 */
function mapLanguageCode(code: string): string {
  const mapping: Record<string, string> = {
    en: 'en',
    de: 'de',
    ja: 'ja',
    zh: 'zh',
    ko: 'ko',
    fr: 'fr',
    es: 'es',
    it: 'it',
    pt: 'pt',
    nl: 'nl',
  };

  return mapping[code] || code;
}
