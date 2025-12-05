import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppError, handleError } from '@/lib/error-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Admin endpoint to reset user credits for testing
 * DANGER: Only use for testing/debugging
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);
    const { credits = 0 } = await req.json();

    // Update user credits
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ credits })
      .eq('id', userId)
      .select('id, credits')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Credits reset to ${credits}`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Reset credits error:', error);
    return handleError(error);
  }
}
