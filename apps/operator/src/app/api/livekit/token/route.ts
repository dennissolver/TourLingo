import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { tourId, participantName, language, isOperator } = await req.json();

    if (!tourId || !participantName) {
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
      identity: `${isOperator ? 'operator' : 'guest'}-${participantName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: participantName,
      metadata: JSON.stringify({
        language: language || 'en',
        isOperator: isOperator || false,
      }),
    });

    // Grant permissions - operators can publish, guests can only subscribe
    token.addGrant({
      room: `tour-${tourId}`,
      roomJoin: true,
      canPublish: isOperator === true,
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
