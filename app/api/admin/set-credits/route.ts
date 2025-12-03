import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, credits } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update credits
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ credits: credits || 999999 })
      .eq('id', user.id)
      .select();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Credits updated for ${email}`,
      user: updatedUser[0],
    });
  } catch (error) {
    console.error('Admin update credits error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
