import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Missing audio file' },
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

    // Prepare form data for ElevenLabs
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('audio', audioFile, 'audio.webm');
    elevenLabsFormData.append('model_id', 'scribe_v1');
    
    if (language) {
      elevenLabsFormData.append('language_code', language);
    }

    const response = await fetch(ELEVENLABS_STT_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenLabsFormData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs STT error:', error);
      return NextResponse.json(
        { error: 'Speech-to-text failed' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      text: data.text || '',
      language: data.language_code,
      confidence: data.language_probability,
    });
  } catch (error) {
    console.error('STT error:', error);
    return NextResponse.json(
      { error: 'Speech-to-text failed' },
      { status: 500 }
    );
  }
}
