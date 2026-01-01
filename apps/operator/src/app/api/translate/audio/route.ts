import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/translate/audio
 *
 * Processes audio through the translation pipeline:
 * 1. ElevenLabs STT - transcribe operator's speech
 * 2. Google Translate - translate to target languages
 * 3. ElevenLabs TTS - synthesize translated audio
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const audioFile = formData.get('audio') as File | null;
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
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!elevenLabsKey) {
      console.error('ELEVENLABS_API_KEY not configured');
      return NextResponse.json(
        { error: 'Translation service not configured (ElevenLabs)' },
        { status: 500 }
      );
    }

    if (!googleKey) {
      console.error('GOOGLE_TRANSLATE_API_KEY not configured');
      return NextResponse.json(
        { error: 'Translation service not configured (Google Translate)' },
        { status: 500 }
      );
    }

    console.log(`Processing translation: ${sourceLanguage} -> ${targetLanguages.join(', ')}`);
    console.log(`Audio file size: ${audioFile.size} bytes, type: ${audioFile.type}`);

    const startTime = Date.now();

    // Step 1: Speech-to-Text (ElevenLabs Scribe)
    const originalText = await transcribeAudio(audioFile, sourceLanguage, elevenLabsKey);

    if (!originalText.trim()) {
      return NextResponse.json({
        originalText: '',
        originalLanguage: sourceLanguage,
        translations: {},
        processingTimeMs: Date.now() - startTime,
      });
    }

    console.log(`Transcribed: "${originalText.substring(0, 50)}..."`);

    // Step 2 & 3: Translate and synthesize in parallel for each language
    const translations: Record<string, { text: string; audioUrl?: string }> = {};

    await Promise.all(
      targetLanguages.map(async (targetLang) => {
        try {
          let translatedText = originalText;

          // Translate if not source language
          if (targetLang !== sourceLanguage) {
            translatedText = await translateText(originalText, sourceLanguage, targetLang, googleKey);
          }

          translations[targetLang] = { text: translatedText };

          // Generate audio if requested
          if (generateAudio) {
            const audioUrl = await synthesizeSpeech(translatedText, targetLang, elevenLabsKey);
            translations[targetLang].audioUrl = audioUrl;
          }
        } catch (error) {
          console.error(`Translation failed for ${targetLang}:`, error);
          translations[targetLang] = { text: `[Translation failed]` };
        }
      })
    );

    const processingTimeMs = Date.now() - startTime;
    console.log(`Translation completed in ${processingTimeMs}ms`);

    return NextResponse.json({
      originalText,
      originalLanguage: sourceLanguage,
      translations,
      processingTimeMs,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}

/**
 * Transcribe audio using ElevenLabs Scribe
 */
async function transcribeAudio(
  audioFile: File,
  language: string,
  apiKey: string
): Promise<string> {
  // Convert File to ArrayBuffer then to Blob for FormData
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBlob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model_id', 'scribe_v1');

  // Map language codes
  const langMap: Record<string, string> = {
    en: 'en', de: 'de', ja: 'ja', zh: 'zh', ko: 'ko',
    fr: 'fr', es: 'es', it: 'it', pt: 'pt', nl: 'nl',
  };
  if (language && langMap[language]) {
    formData.append('language_code', langMap[language]);
  }

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
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

  const data = await response.json();
  return data.text || '';
}

/**
 * Translate text using Google Cloud Translation
 */
async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string
): Promise<string> {
  if (sourceLanguage === targetLanguage || !text.trim()) {
    return text;
  }

  // Map zh to zh-CN for Google
  const langMap: Record<string, string> = { zh: 'zh-CN' };
  const source = langMap[sourceLanguage] || sourceLanguage;
  const target = langMap[targetLanguage] || targetLanguage;

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate error: ${error}`);
  }

  const data = await response.json();
  return data.data.translations[0]?.translatedText || text;
}

/**
 * Synthesize speech using ElevenLabs TTS
 */
async function synthesizeSpeech(
  text: string,
  language: string,
  apiKey: string
): Promise<string> {
  // Use Tim's voice or default
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '2pwMUCWPsm9t6AwXYaCj';

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5', // Low latency model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS error: ${error}`);
  }

  // Convert audio to base64 data URL
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:audio/mp3;base64,${base64}`;
}