import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role for inserting participants
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase credentials not configured');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

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
      console.error('LiveKit credentials not configured');
      return NextResponse.json(
        { error: 'LiveKit not configured' },
        { status: 500 }
      );
    }

    // Create unique identity for participant
    const identity = `${isOperator ? 'operator' : 'guest'}-${participantName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    // Register participant in Supabase
    const supabase = getSupabaseAdmin();
    let participantId: string | null = null;

    if (supabase) {
      try {
        const { data: participant, error: insertError } = await supabase
          .from('participants')
          .insert({
            tour_id: tourId,
            display_name: participantName,
            language: language || 'en',
            is_operator: isOperator || false,
            livekit_identity: identity,
            joined_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to register participant:', insertError);
          // Continue anyway - don't block joining if DB insert fails
        } else {
          participantId = participant?.id;
          console.log(`Registered ${isOperator ? 'operator' : 'guest'}: ${participantName} (${language}) for tour ${tourId}`);
        }
      } catch (dbError) {
        console.error('Database error registering participant:', dbError);
        // Continue anyway
      }
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName,
      metadata: JSON.stringify({
        language: language || 'en',
        isOperator: isOperator || false,
        participantId, // Include Supabase participant ID in metadata
      }),
    });

    // Grant permissions
    // Both operators and guests can publish audio (guests need this to ask questions)
    // Both can subscribe to hear each other
    token.addGrant({
      room: `tour-${tourId}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      participantId, // Return so client can use if needed
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}