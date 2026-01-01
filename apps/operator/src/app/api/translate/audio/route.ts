import { NextRequest, NextResponse } from 'next/server';
import { processAudioTranslation, getActiveLanguages } from '@tourlingo/translation';

export const runtime = 'nodejs';
export const maxDuration = 30; // Allow up to 30 seconds for processing

/**
 * POST /api/translate/audio
 *
 * Processes audio through the translation pipeline:
 * 1. ElevenLabs STT - transcribe operator's speech
 * 2. Google Translate - translate to target languages
 * 3. ElevenLabs TTS - synthesize translated audio
 *
 * Request body (FormData):
 * - audio: Blob - the audio file to translate
 * - sourceLanguage: string - operator's language (default: 'en')
 * - targetLanguages: string - comma-separated list of target languages
 * - generateAudio: boolean - whether to generate TTS audio (default: true)
 *
 * Response:
 * {
 *   originalText: string,
 *   translations: {
 *     [language]: {
 *       text: string,
 *       audioUrl?: string (base64 data URL)
 *     }
 *   },
 *   processingTimeMs: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const audioFile = formData.get('audio') as Blob | null;
    const sourceLanguage = (formData.get('sourceLanguage') as string) || 'en';
    const targetLanguagesStr = formData.get('targetLanguages') as string;
    const generateAudio = formData.get('generateAudio') !== 'false';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!targetLanguagesStr) {
      return NextResponse.json(
        { error: 'No target languages specified' },
        { status: 400 }
      );
    }

    const targetLanguages = targetLanguagesStr.split(',').map(l => l.trim());

    // Check for required API keys
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return NextResponse.json(
        { error: 'Translation service not configured (ElevenLabs)' },
        { status: 500 }
      );
    }

    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.error('GOOGLE_TRANSLATE_API_KEY not configured');
      return NextResponse.json(
        { error: 'Translation service not configured (Google Translate)' },
        { status: 500 }
      );
    }

    console.log(`Processing translation: ${sourceLanguage} -> ${targetLanguages.join(', ')}`);

    // Process through translation pipeline
    const result = await processAudioTranslation(audioFile, {
      sourceLanguage,
      targetLanguages,
      generateAudio,
      useOperatorVoice: true, // Use Tim's cloned voice
      lowLatency: true, // Use Flash model for faster response
      voiceStyle: 'narration',
    });

    console.log(`Translation completed in ${result.processingTimeMs}ms: "${result.originalText.substring(0, 50)}..."`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}