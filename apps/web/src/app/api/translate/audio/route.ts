import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Noise patterns to filter out
const NOISE_PATTERNS = [
  /\[.*?(noise|sound|music|traffic|wind|rain|background|ambient|silence|static|breathing|cough|sneeze|laugh|sigh|pause|inaudible|unclear|unintelligible).*?\]/gi,
  /\(.*?(noise|sound|music|traffic|wind|rain|background|ambient|silence|static|breathing|cough|sneeze|laugh|sigh|pause|inaudible|unclear|unintelligible).*?\)/gi,
  /\*.*?(noise|sound|cough|sneeze|laugh|sigh|clears throat|breathing).*?\*/gi,
  /^\s*(um+|uh+|ah+|er+|hmm+|mhm+|oh+)\s*$/gi,
  /^[\s.,!?;:'"]+$/,
  /^.{1,2}$/,
];

const NOISE_ONLY_PATTERNS = [
  /^\s*\[.*?\]\s*$/,
  /^\s*\(.*?\)\s*$/,
  /^\s*\*.*?\*\s*$/,
];

function filterNoise(text: string): { filteredText: string; isNoise: boolean; noiseDescriptions: string[] } {
  const noiseDescriptions: string[] = [];
  let filteredText = text;

  // Check if entire text is just noise
  for (const pattern of NOISE_ONLY_PATTERNS) {
    if (pattern.test(text.trim())) {
      const match = text.match(/[\[\(\*](.+?)[\]\)\*]/);
      if (match) noiseDescriptions.push(match[1]);
      return { filteredText: '', isNoise: true, noiseDescriptions };
    }
  }

  // Remove noise patterns
  for (const pattern of NOISE_PATTERNS) {
    const matches = filteredText.match(pattern);
    if (matches) {
      noiseDescriptions.push(...matches);
      filteredText = filteredText.replace(pattern, '');
    }
  }

  filteredText = filteredText.replace(/\s+/g, ' ').trim();
  const isNoise = filteredText.length < 3 || /^[\s.,!?;:'"]+$/.test(filteredText);

  return { filteredText: isNoise ? '' : filteredText, isNoise, noiseDescriptions };
}

function isLikelySpeech(text: string): boolean {
  if (!text || text.trim().length < 3) return false;
  
  for (const pattern of NOISE_ONLY_PATTERNS) {
    if (pattern.test(text.trim())) return false;
  }
  
  const words = text.split(/\s+/).filter(w => 
    w.length > 2 && 
    !/^(um+|uh+|ah+|er+|hmm+)$/i.test(w) &&
    !/[\[\]\(\)\*]/.test(w)
  );
  
  return words.length >= 2;
}

/**
 * POST /api/translate/audio
 * Guest-side translation endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const audioFile = formData.get('audio') as File | null;
    const sourceLanguage = (formData.get('sourceLanguage') as string) || 'en';
    const targetLanguagesStr = formData.get('targetLanguages') as string;
    const generateAudio = formData.get('generateAudio') !== 'false';
    const enableNoiseFilter = formData.get('enableNoiseFilter') !== 'false';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!targetLanguagesStr) {
      return NextResponse.json({ error: 'No target languages specified' }, { status: 400 });
    }

    const targetLanguages = targetLanguagesStr.split(',').map(l => l.trim());

    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    if (!elevenLabsKey || !googleKey) {
      return NextResponse.json({ error: 'Translation service not configured' }, { status: 500 });
    }

    console.log(`Guest translation: ${sourceLanguage} -> ${targetLanguages.join(', ')}`);

    const startTime = Date.now();

    // Step 1: Speech-to-Text
    let originalText = await transcribeAudio(audioFile, sourceLanguage, elevenLabsKey);

    if (!originalText.trim()) {
      return NextResponse.json({
        originalText: '',
        originalLanguage: sourceLanguage,
        translations: {},
        processingTimeMs: Date.now() - startTime,
      });
    }

    console.log(`Raw transcription: "${originalText}"`);

    // Step 2: Noise Filtering
    let filteredText = originalText;
    let wasFiltered = false;
    let noiseDescriptions: string[] = [];

    if (enableNoiseFilter) {
      const filterResult = filterNoise(originalText);
      filteredText = filterResult.filteredText;
      wasFiltered = filterResult.isNoise || filterResult.noiseDescriptions.length > 0;
      noiseDescriptions = filterResult.noiseDescriptions;

      if (filterResult.isNoise) {
        console.log(`Filtered as noise: "${originalText}"`);
        return NextResponse.json({
          originalText,
          filteredText: '',
          originalLanguage: sourceLanguage,
          translations: {},
          processingTimeMs: Date.now() - startTime,
          filtered: true,
          filterReason: 'noise',
          noiseDescriptions,
        });
      }
    }

    if (!isLikelySpeech(filteredText)) {
      return NextResponse.json({
        originalText,
        filteredText,
        originalLanguage: sourceLanguage,
        translations: {},
        processingTimeMs: Date.now() - startTime,
        filtered: true,
        filterReason: 'too_short',
      });
    }

    // Step 3 & 4: Translate and synthesize
    const translations: Record<string, { text: string; audioUrl?: string }> = {};

    await Promise.all(
      targetLanguages.map(async (targetLang) => {
        try {
          let translatedText = filteredText;

          if (targetLang !== sourceLanguage) {
            translatedText = await translateText(filteredText, sourceLanguage, targetLang, googleKey);
          }

          translations[targetLang] = { text: translatedText };

          if (generateAudio) {
            const audioUrl = await synthesizeSpeech(translatedText, targetLang, elevenLabsKey);
            translations[targetLang].audioUrl = audioUrl;
          }
        } catch (error) {
          console.error(`Translation failed for ${targetLang}:`, error);
          translations[targetLang] = { text: '[Translation failed]' };
        }
      })
    );

    return NextResponse.json({
      originalText,
      filteredText: wasFiltered ? filteredText : undefined,
      originalLanguage: sourceLanguage,
      translations,
      processingTimeMs: Date.now() - startTime,
      filtered: wasFiltered,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audioFile: File, language: string, apiKey: string): Promise<string> {
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBlob = new Blob([arrayBuffer], { type: audioFile.type || 'audio/webm' });

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model_id', 'scribe_v1');

  const langMap: Record<string, string> = {
    en: 'en', de: 'de', ja: 'ja', zh: 'zh', ko: 'ko',
    fr: 'fr', es: 'es', it: 'it', pt: 'pt', nl: 'nl',
  };
  if (language && langMap[language]) {
    formData.append('language_code', langMap[language]);
  }

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs STT error: ${error}`);
  }

  const data = await response.json();
  return data.text || '';
}

async function translateText(text: string, source: string, target: string, apiKey: string): Promise<string> {
  if (source === target || !text.trim()) return text;

  const langMap: Record<string, string> = { zh: 'zh-CN' };
  const srcLang = langMap[source] || source;
  const tgtLang = langMap[target] || target;

  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: srcLang, target: tgtLang, format: 'text' }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate error: ${error}`);
  }

  const data = await response.json();
  return data.data.translations[0]?.translatedText || text;
}

async function synthesizeSpeech(text: string, language: string, apiKey: string): Promise<string> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '2pwMUCWPsm9t6AwXYaCj';

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS error: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:audio/mp3;base64,${base64}`;
}
