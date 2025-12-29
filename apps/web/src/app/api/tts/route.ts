import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Tim's voice ID - primary voice for TourLingo
const TIM_VOICE_ID = '2pwMUCWPsm9t6AwXYaCj';
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || TIM_VOICE_ID;

export async function POST(req: NextRequest) {
  try {
    const { text, language, voiceId, useOperatorVoice, stream } = await req.json();

    if (!text || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: text, language' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured' },
        { status: 500 }
      );
    }

    // Determine voice to use
    let selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    
    // Use operator's cloned voice if requested
    if (useOperatorVoice && process.env.ELEVENLABS_OPERATOR_VOICE_ID) {
      selectedVoiceId = process.env.ELEVENLABS_OPERATOR_VOICE_ID;
    }

    // Use Flash model for low latency
    const modelId = 'eleven_flash_v2_5';

    const endpoint = stream 
      ? `${ELEVENLABS_TTS_URL}/${selectedVoiceId}/stream`
      : `${ELEVENLABS_TTS_URL}/${selectedVoiceId}`;

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
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
        ...(stream && { optimize_streaming_latency: 3 }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs TTS error:', error);
      return NextResponse.json(
        { error: 'Text-to-speech failed' },
        { status: 500 }
      );
    }

    // For streaming response
    if (stream && response.body) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // For regular response
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Text-to-speech failed' },
      { status: 500 }
    );
  }
}
