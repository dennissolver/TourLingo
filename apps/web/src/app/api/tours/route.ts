import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    const supabase = getSupabase();
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

    const supabase = getSupabase();
    const accessCode = generateAccessCode();

    const { data: tour, error } = await supabase
      .from('tours')
      .insert([{
        name,
        operator_id: operatorId,
        max_guests: maxGuests || 16,
        access_code: accessCode,
        status: 'created',
      }])
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

---

## Also Check Vercel Environment Variables

Make sure **both** Vercel projects have:
```
NEXT_PUBLIC_SUPABASE_URL = https://qrcvpdteiepgnhuizvtp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key