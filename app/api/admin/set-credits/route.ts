import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SetCreditsSchema, validateInput } from '@/lib/validation';
import { AppError, handleError, logAction } from '@/lib/error-handler';

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Check for API key in header
    const apiKey = req.headers.get('X-Admin-API-Key');

    if (!apiKey || apiKey !== ADMIN_API_KEY) {
      logAction('UNAUTHORIZED_ADMIN_ACCESS', -1, { reason: 'Invalid API key' });
      throw new AppError(401, 'Unauthorized: Invalid or missing API key', 'UNAUTHORIZED');
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new AppError(400, 'Invalid JSON format', 'INVALID_JSON');
    }

    // Validate against schema
    const { email, credits } = await validateInput(SetCreditsSchema, body);

    // Find user by email
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      logAction('USER_NOT_FOUND_ADMIN', -1, { email });
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Update credits
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ credits })
      .eq('id', user.id)
      .select();

    if (updateError) {
      throw updateError;
    }

    // Log the admin action
    logAction('ADMIN_CREDITS_UPDATED', user.id, {
      email,
      oldCredits: user.credits,
      newCredits: credits,
    });

    return NextResponse.json({
      success: true,
      message: `Credits updated for ${email}`,
      user: updatedUser[0],
    });
  } catch (error) {
    if (error instanceof AppError) {
      return handleError(error);
    }

    console.error('Admin update credits error:', error);
    return handleError(
      new AppError(500, 'Failed to update credits', 'ADMIN_UPDATE_FAILED')
    );
  }
}
