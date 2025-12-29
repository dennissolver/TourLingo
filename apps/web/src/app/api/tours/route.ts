import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/tours?code=ABC123 - Get tour by access code
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const code = req.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Tour code required' },
        { status: 400 }
      );
    }

    const { data: tour, error } = await supabase
      .from('tours')
      .select('*')
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