/**
 * Text Translation using Google Cloud Translation API v2
 * https://cloud.google.com/translate/docs/basic/translating-text
 */

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

/**
 * Translate text from source language to target language
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  // Skip if same language
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  // Skip empty text
  if (!text.trim()) {
    return text;
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');
  }

  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: mapLanguageCode(sourceLanguage),
      target: mapLanguageCode(targetLanguage),
      format: 'text',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Translate API error: ${error}`);
  }

  const data: GoogleTranslateResponse = await response.json();

  return data.data.translations[0]?.translatedText || text;
}

/**
 * Translate text to multiple target languages in parallel
 */
export async function translateTextBatch(
  text: string,
  sourceLanguage: string,
  targetLanguages: string[]
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};

  // Include source language as-is
  translations[sourceLanguage] = text;

  // Filter out source language from targets
  const targets = targetLanguages.filter((lang) => lang !== sourceLanguage);

  if (targets.length === 0) {
    return translations;
  }

  // Translate in parallel
  await Promise.all(
    targets.map(async (targetLang) => {
      try {
        translations[targetLang] = await translateText(
          text,
          sourceLanguage,
          targetLang
        );
      } catch (error) {
        console.error(`Failed to translate to ${targetLang}:`, error);
        translations[targetLang] = text; // Fallback to original
      }
    })
  );

  return translations;
}

/**
 * Detect the language of a text
 */
export async function detectLanguage(text: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: text }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Language detection error: ${error}`);
  }

  const data = await response.json();
  return data.data.detections[0]?.[0]?.language || 'en';
}

/**
 * Map our language codes to Google's (mostly the same)
 */
function mapLanguageCode(code: string): string {
  const mapping: Record<string, string> = {
    zh: 'zh-CN', // Simplified Chinese
  };

  return mapping[code] || code;
}
