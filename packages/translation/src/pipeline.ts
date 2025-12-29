/**
 * Translation Pipeline
 * 
 * Full flow: Audio → ElevenLabs STT → Google Translate → ElevenLabs TTS → Audio
 * 
 * Latency breakdown:
 * - ElevenLabs Scribe v2: ~150ms
 * - Google Translate: ~50ms
 * - ElevenLabs Flash TTS: ~75ms
 * - Total: ~300-500ms
 */

import { transcribeAudio, createRealtimeSTTConnection } from './stt';
import { translateText } from './translate';
import { synthesizeSpeech, synthesizeSpeechStream } from './tts';
import { ELEVENLABS_CONFIG, getVoiceSettings } from './elevenlabs';
import { SUPPORTED_LANGUAGES } from '@tourlingo/types';

export interface TranslationResult {
  originalText: string;
  originalLanguage: string;
  translations: Record<string, {
    text: string;
    audioUrl?: string;
  }>;
  processingTimeMs?: number;
}

export interface PipelineOptions {
  sourceLanguage: string;
  targetLanguages: string[];
  generateAudio?: boolean;
  useOperatorVoice?: boolean; // Use Tim's cloned voice
  lowLatency?: boolean; // Use Flash model for TTS
  voiceStyle?: 'narration' | 'conversation' | 'announcement';
}

/**
 * Full translation pipeline: Audio → Text → Translations → Audio
 * Uses ElevenLabs for STT and TTS, Google for translation
 */
export async function processAudioTranslation(
  audioBlob: Blob,
  options: PipelineOptions
): Promise<TranslationResult> {
  const startTime = Date.now();
  const { 
    sourceLanguage, 
    targetLanguages, 
    generateAudio = true,
    useOperatorVoice = false,
    lowLatency = true,
    voiceStyle = 'narration',
  } = options;

  // Step 1: Speech-to-Text (ElevenLabs Scribe)
  const originalText = await transcribeAudio(audioBlob, sourceLanguage);

  if (!originalText.trim()) {
    return {
      originalText: '',
      originalLanguage: sourceLanguage,
      translations: {},
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Step 2 & 3: Translate and synthesize in parallel for each language
  const translations: TranslationResult['translations'] = {};

  await Promise.all(
    targetLanguages.map(async (targetLang) => {
      if (targetLang === sourceLanguage) {
        // No translation needed for source language
        translations[targetLang] = { text: originalText };
        
        // But still generate audio if requested
        if (generateAudio) {
          const audioUrl = await synthesizeSpeech(originalText, targetLang, {
            useOperatorVoice,
            model: lowLatency ? 'flash' : 'multilingual',
            ...getVoiceSettings(voiceStyle),
          });
          translations[targetLang].audioUrl = audioUrl;
        }
        return;
      }

      try {
        // Translate text (Google)
        const translatedText = await translateText(
          originalText,
          sourceLanguage,
          targetLang
        );

        translations[targetLang] = { text: translatedText };

        // Generate audio (ElevenLabs)
        if (generateAudio) {
          const audioUrl = await synthesizeSpeech(translatedText, targetLang, {
            useOperatorVoice,
            model: lowLatency ? 'flash' : 'multilingual',
            ...getVoiceSettings(voiceStyle),
          });
          translations[targetLang].audioUrl = audioUrl;
        }
      } catch (error) {
        console.error(`Translation failed for ${targetLang}:`, error);
        translations[targetLang] = { text: `[Translation failed]` };
      }
    })
  );

  return {
    originalText,
    originalLanguage: sourceLanguage,
    translations,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Real-time translation pipeline using WebSocket connections
 * For live streaming with minimal latency
 */
export function createRealtimePipeline(options: {
  sourceLanguage: string;
  targetLanguages: string[];
  onTranscript: (text: string, isFinal: boolean) => void;
  onTranslation: (language: string, text: string, audioStream?: ReadableStream) => void;
  onError: (error: Error) => void;
  useOperatorVoice?: boolean;
}) {
  const { 
    sourceLanguage, 
    targetLanguages, 
    onTranscript, 
    onTranslation,
    onError,
    useOperatorVoice = false,
  } = options;

  // Create real-time STT connection
  const sttConnection = createRealtimeSTTConnection({
    language: sourceLanguage,
    onTranscript: async (text, isFinal) => {
      onTranscript(text, isFinal);

      // Only process final transcripts for translation
      if (isFinal && text.trim()) {
        // Process translations in parallel
        await Promise.all(
          targetLanguages.map(async (targetLang) => {
            try {
              let translatedText = text;
              
              // Translate if not source language
              if (targetLang !== sourceLanguage) {
                translatedText = await translateText(text, sourceLanguage, targetLang);
              }

              // Stream audio
              const audioStream = await synthesizeSpeechStream(translatedText, targetLang, {
                useOperatorVoice,
              });

              onTranslation(targetLang, translatedText, audioStream);
            } catch (error) {
              console.error(`Real-time translation failed for ${targetLang}:`, error);
              onError(error as Error);
            }
          })
        );
      }
    },
    onError,
  });

  return {
    // Send audio chunks to STT
    processAudioChunk: (chunk: ArrayBuffer) => {
      sttConnection.send(chunk);
    },
    
    // Commit current segment (triggers final transcript)
    commit: () => {
      sttConnection.commit();
    },
    
    // Close connection
    close: () => {
      sttConnection.close();
    },
  };
}

/**
 * Translate text to multiple languages (no audio)
 */
export async function translateToMultipleLanguages(
  text: string,
  sourceLanguage: string,
  targetLanguages: string[]
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};

  await Promise.all(
    targetLanguages.map(async (targetLang) => {
      if (targetLang === sourceLanguage) {
        translations[targetLang] = text;
        return;
      }

      try {
        translations[targetLang] = await translateText(
          text,
          sourceLanguage,
          targetLang
        );
      } catch (error) {
        console.error(`Translation failed for ${targetLang}:`, error);
        translations[targetLang] = text; // Fallback to original
      }
    })
  );

  return translations;
}

/**
 * Generate audio for multiple languages from same text
 * Useful for pre-rendered announcements
 */
export async function generateMultiLanguageAudio(
  translations: Record<string, string>,
  options?: {
    useOperatorVoice?: boolean;
    voiceStyle?: 'narration' | 'conversation' | 'announcement';
  }
): Promise<Record<string, string>> {
  const audioUrls: Record<string, string> = {};
  const voiceSettings = getVoiceSettings(options?.voiceStyle || 'narration');

  await Promise.all(
    Object.entries(translations).map(async ([language, text]) => {
      try {
        audioUrls[language] = await synthesizeSpeech(text, language, {
          useOperatorVoice: options?.useOperatorVoice,
          model: 'multilingual', // Use best quality for pre-rendered
          ...voiceSettings,
        });
      } catch (error) {
        console.error(`Audio generation failed for ${language}:`, error);
      }
    })
  );

  return audioUrls;
}

/**
 * Get active languages from participant list
 */
export function getActiveLanguages(
  participants: Array<{ language: string }>
): string[] {
  const languages = new Set(participants.map((p) => p.language));
  return Array.from(languages).filter((lang) =>
    SUPPORTED_LANGUAGES.some((l) => l.code === lang)
  );
}

/**
 * Estimate processing time based on text length and language count
 */
export function estimateProcessingTime(
  textLength: number,
  languageCount: number,
  generateAudio: boolean
): number {
  // Base latencies
  const sttLatency = 150; // ElevenLabs Scribe
  const translateLatency = 50; // Google per language (parallel)
  const ttsLatency = 75; // ElevenLabs Flash per language (parallel)

  let total = sttLatency + translateLatency;
  
  if (generateAudio) {
    total += ttsLatency;
  }

  // Add buffer for network overhead
  total += 100;

  return total;
}
