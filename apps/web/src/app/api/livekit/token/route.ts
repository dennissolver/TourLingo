import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { tourId, participantName, language, isOperator } = await req.json();

    if (!tourId || !participantName || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 500 }
      );
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: `${participantName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: participantName,
      metadata: JSON.stringify({
        language,
        isOperator: isOperator || false,
      }),
    });

    // Grant permissions
    token.addGrant({
      room: `tour-${tourId}`,
      roomJoin: true,
      canPublish: isOperator || false, // Only operators can publish by default
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return NextResponse.json({ token: jwt });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
