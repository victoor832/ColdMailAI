import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppError, handleError, logAction } from '@/lib/error-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Manual payment processor for debugging
 * Processes unprocessed payments and adds credits
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credits')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get unprocessed payments (where credits_added > 0 but user didn't get them)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, credits_added, stripe_price_id, stripe_product_id')
      .eq('user_id', userId)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      throw paymentsError;
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No payments to process',
      });
    }

    // Calculate total credits from all successful payments
    const totalCreditsToAdd = payments.reduce((sum, p) => sum + p.credits_added, 0);

    logAction('MANUAL_CREDIT_PROCESSING', userId, {
      paymentCount: payments.length,
      totalCreditsToAdd,
      currentCredits: user.credits,
    });

    // Update user credits
    const newCredits = user.credits + totalCreditsToAdd;
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId)
      .select('credits')
      .single();

    if (updateError) {
      throw updateError;
    }

    logAction('MANUAL_CREDITS_ADDED', userId, {
      creditsAdded: totalCreditsToAdd,
      newTotal: updatedUser?.credits || newCredits,
    });

    return NextResponse.json({
      success: true,
      message: `Added ${totalCreditsToAdd} credits to your account`,
      previousCredits: user.credits,
      newCredits: updatedUser?.credits || newCredits,
      paymentsProcessed: payments.length,
    });
  } catch (error) {
    console.error('Manual processing error:', error);
    return handleError(error);
  }
}
