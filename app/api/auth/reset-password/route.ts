import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { AppError, handleError } from '@/lib/error-handler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      throw new AppError(400, 'Token and password are required', 'MISSING_FIELDS');
    }

    if (password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters', 'PASSWORD_TOO_SHORT');
    }

    // Hash the token to look it up in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the reset token
    const { data: resetRecord, error: queryError } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .single();

    if (queryError || !resetRecord) {
      throw new AppError(400, 'Invalid or expired reset link', 'INVALID_TOKEN');
    }

    // Check if token has expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      throw new AppError(400, 'Reset link has expired', 'TOKEN_EXPIRED');
    }

    // Check if token was already used
    if (resetRecord.used_at) {
      throw new AppError(400, 'This reset link has already been used', 'TOKEN_ALREADY_USED');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', resetRecord.user_id);

    if (updateError) {
      console.error('Error updating password:', updateError);
      throw new AppError(500, 'Failed to update password', 'UPDATE_ERROR');
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
      // Don't fail the request if this fails - password is already updated
    }

    // Log the action
    console.log(`[PASSWORD_RESET_SUCCESS] User ID: ${resetRecord.user_id}`);

    return NextResponse.json(
      { success: true, message: 'Password has been reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error);
  }
}
