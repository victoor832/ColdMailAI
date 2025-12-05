import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { AppError, handleError, validateEmail } from '@/lib/error-handler';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email
    validateEmail(email);

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      // Don't reveal if user exists (security best practice)
      // But return success anyway
      return NextResponse.json(
        { message: 'If an account exists with this email, a reset link has been sent.' },
        { status: 200 }
      );
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error creating reset token:', insertError);
      throw new AppError(500, 'Failed to generate reset link', 'TOKEN_CREATION_ERROR');
    }

    // Send email with reset link
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

    // TODO: Send email using Resend or another service
    console.log(`[PASSWORD_RESET] Reset link for ${email}: ${resetUrl}`);
    console.log(`[PASSWORD_RESET] Token: ${token}`);

    // In development, you could return the link for testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEV] Reset URL:', resetUrl);
    }

    return NextResponse.json(
      { message: 'If an account exists with this email, a reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
