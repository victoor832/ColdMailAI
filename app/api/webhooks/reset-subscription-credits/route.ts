import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAction } from '@/lib/error-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * Reset subscription credits for users with active subscriptions
 * Should be called monthly via cron job or manually
 * This endpoint is called by Vercel Crons or manually for testing
 */
export async function POST(req: NextRequest) {
  try {
    const now = new Date();

    // Find all users with active subscriptions whose period has ended
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, subscription_plan, subscription_monthly_credits, subscription_current_period_end')
      .eq('subscription_status', 'active')
      .lte('subscription_current_period_end', now.toISOString());

    if (queryError) {
      logAction('CREDITS_RESET_QUERY_ERROR', -1, { error: queryError.message });
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: 'No subscriptions to reset',
        count: 0,
      });
    }

    // Reset credits for each user
    const results: any[] = [];

    for (const user of users) {
      try {
        const monthlyCredits = user.subscription_monthly_credits || 0;
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            credits: monthlyCredits,
            subscription_current_period_start: periodStart.toISOString(),
            subscription_current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          logAction('CREDITS_RESET_ERROR', user.id, { error: updateError.message });
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: updateError.message,
          });
        } else {
          logAction('CREDITS_RESET_SUCCESS', user.id, {
            plan: user.subscription_plan,
            creditsReset: monthlyCredits,
            newPeriodEnd: periodEnd.toISOString(),
          });
          results.push({
            userId: user.id,
            email: user.email,
            status: 'success',
            creditsReset: monthlyCredits,
          });
        }
      } catch (error) {
        logAction('CREDITS_RESET_EXCEPTION', user.id, {
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      message: 'Credits reset completed',
      totalProcessed: users.length,
      results,
      successful: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status !== 'success').length,
    });
  } catch (error) {
    console.error('Credits reset error:', error);
    logAction('CREDITS_RESET_FATAL_ERROR', -1, {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'Failed to reset credits',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check which subscriptions are due for reset
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, subscription_plan, subscription_monthly_credits, subscription_current_period_end')
      .eq('subscription_status', 'active')
      .lte('subscription_current_period_end', now.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Subscriptions due for reset',
      count: users?.length || 0,
      users: users || [],
    });
  } catch (error) {
    console.error('Check reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check subscriptions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
