import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@tourlingo/api';

// GET /api/tours - Get all tours for current operator
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // TODO: Get operator ID from auth session
    const operatorId = req.headers.get('x-operator-id');
    
    if (!operatorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: tours, error } = await supabase
      .from('tours')
      .select('*')
      .eq('operator_id', operatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tours });
  } catch (error) {
    console.error('Error fetching tours:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    );
  }
}

// POST /api/tours - Create a new tour
export async function POST(req: NextRequest) {
  try {
    const { name, maxGuests, operatorId } = await req.json();

    if (!name || !operatorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Generate access code
    const accessCode = generateAccessCode();

    const { data: tour, error } = await supabase
      .from('tours')
      .insert({
        operator_id: operatorId,
        name,
        access_code: accessCode,
        max_guests: maxGuests || 16,
        status: 'created',
        livekit_room_name: `tour-${accessCode.toLowerCase()}`,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ tour });
  } catch (error) {
    console.error('Error creating tour:', error);
    return NextResponse.json(
      { error: 'Failed to create tour' },
      { status: 500 }
    );
  }
}

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
