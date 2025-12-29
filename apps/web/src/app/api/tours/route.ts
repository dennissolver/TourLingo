import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tours?code=ABC123
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Tour code required' },
      { status: 400 }
    );
  }

  try {
    const { data: tour, error } = await supabase
      .from('tours')
      .select('id, name, status, max_guests, operator_id')
      .eq('access_code', code.toUpperCase())
      .single();

    if (error || !tour) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tour });
  } catch (error) {
    console.error('Error fetching tour:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tour' },
      { status: 500 }
    );
  }
}

// POST /api/tours - Create a new tour (operator only)
export async function POST(req: NextRequest) {
  try {
    const { name, operatorId, maxGuests } = await req.json();

    if (!name || !operatorId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a unique 6-character access code
    const accessCode = generateAccessCode();

    const { data: tour, error } = await supabase
      .from('tours')
      .insert({
        name,
        operator_id: operatorId,
        max_guests: maxGuests || 16,
        access_code: accessCode,
        status: 'created',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
