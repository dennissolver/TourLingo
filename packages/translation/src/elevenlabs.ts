/**
 * ElevenLabs utilities and configuration
 * https://elevenlabs.io/docs
 */

// ============================================
// CONFIGURATION
// ============================================

export const ELEVENLABS_CONFIG = {
  // API endpoints
  baseUrl: 'https://api.elevenlabs.io/v1',
  
  // Models
  models: {
    // Speech-to-Text
    stt: 'scribe_v1',
    sttRealtime: 'scribe_v2_realtime',
    
    // Text-to-Speech
    ttsFlash: 'eleven_flash_v2_5', // Low latency (~75ms)
    ttsMultilingual: 'eleven_multilingual_v2', // Best quality
  },
  
  // Voice settings presets
  voiceSettings: {
    // For tour narration - clear, stable
    narration: {
      stability: 0.6,
      similarity_boost: 0.75,
      style: 0.1,
      use_speaker_boost: true,
    },
    // For questions/conversation - more expressive
    conversation: {
      stability: 0.4,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true,
    },
    // For announcements - very clear
    announcement: {
      stability: 0.8,
      similarity_boost: 0.7,
      style: 0,
      use_speaker_boost: true,
    },
  },
  
  // Latency optimization levels
  latencyOptimization: {
    none: 0,
    normal: 1,
    strong: 2,
    max: 3,
    maxNoNormalizer: 4, // Fastest but may mispronounce numbers/dates
  },
};

// ============================================
// RECOMMENDED VOICES BY LANGUAGE
// ============================================

// Tim's voice - primary voice for TourLingo
export const TIM_VOICE = {
  id: '2pwMUCWPsm9t6AwXYaCj',
  name: 'Tim',
  style: 'warm, friendly Australian tour guide',
  agentId: 'agent_5301kdnyyfnyenea7vgt9zjmwrwz',
};

// Fallback voices from ElevenLabs library
export const RECOMMENDED_VOICES = {
  // Primary - Tim's voice
  primary: TIM_VOICE,
  
  // Professional male voices (fallbacks)
  male: [
    TIM_VOICE,
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', style: 'deep, warm' },
    { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew', style: 'confident, mature' },
  ],
  
  // Professional female voices
  female: [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', style: 'friendly, clear' },
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 'calm, professional' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', style: 'confident, energetic' },
  ],
};

// ============================================
// LANGUAGE SUPPORT
// ============================================

export const ELEVENLABS_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'ta', name: 'Tamil' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'fi', name: 'Finnish' },
  { code: 'ro', name: 'Romanian' },
  { code: 'da', name: 'Danish' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'ms', name: 'Malay' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hr', name: 'Croatian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'no', name: 'Norwegian' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a language is supported by ElevenLabs
 */
export function isLanguageSupported(code: string): boolean {
  return ELEVENLABS_LANGUAGES.some((lang) => lang.code === code);
}

/**
 * Get voice settings for a specific use case
 */
export function getVoiceSettings(
  useCase: 'narration' | 'conversation' | 'announcement'
) {
  return ELEVENLABS_CONFIG.voiceSettings[useCase];
}

/**
 * Calculate estimated cost for TTS
 * ElevenLabs pricing: $0.30 per 1K characters (Starter)
 * Pro/Scale plans have lower per-character costs
 */
export function estimateTTSCost(
  characterCount: number,
  plan: 'starter' | 'creator' | 'pro' | 'scale' = 'creator'
): number {
  const costPer1K = {
    starter: 0.30,
    creator: 0.24,
    pro: 0.18,
    scale: 0.11,
  };
  
  return (characterCount / 1000) * costPer1K[plan];
}

/**
 * Calculate estimated cost for STT
 * ElevenLabs Scribe: ~$0.0001 per second (estimate)
 */
export function estimateSTTCost(durationSeconds: number): number {
  const costPerSecond = 0.0001;
  return durationSeconds * costPerSecond;
}

/**
 * Get the best model based on latency requirements
 */
export function getBestTTSModel(
  requireLowLatency: boolean
): string {
  return requireLowLatency
    ? ELEVENLABS_CONFIG.models.ttsFlash
    : ELEVENLABS_CONFIG.models.ttsMultilingual;
}
