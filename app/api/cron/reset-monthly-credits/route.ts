import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAction } from '@/lib/error-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Vercel Cron Job - Reset subscription credits monthly
 * Runs on the first day of every month at 00:00 UTC
 * Configured in vercel.json
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    logAction('CRON_MONTHLY_RESET_START', -1, { timestamp: now.toISOString() });

    // Find all users with active subscriptions whose period has ended
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, subscription_plan, subscription_monthly_credits, subscription_current_period_end')
      .eq('subscription_status', 'active')
      .lte('subscription_current_period_end', now.toISOString());

    if (queryError) {
      logAction('CRON_RESET_QUERY_ERROR', -1, { error: queryError.message });
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      logAction('CRON_NO_SUBSCRIPTIONS_TO_RESET', -1, {});
      return NextResponse.json({
        message: 'No subscriptions to reset',
        count: 0,
        timestamp: now.toISOString(),
      });
    }

    logAction('CRON_PROCESSING_SUBSCRIPTIONS', -1, { count: users.length });

    // Reset credits for each user
    const results: any[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const user of users) {
      try {
        // Only reset UNLIMITED users - they pay monthly and need credits refreshed
        if (user.subscription_plan !== 'unlimited') {
          logAction('CRON_SKIP_NON_UNLIMITED', user.id, {});
          results.push({
            userId: user.id,
            email: user.email,
            status: 'skipped',
            reason: 'Non-unlimited plan - no monthly reset needed',
          });
          continue;
        }

        const monthlyCredits = user.subscription_monthly_credits || null;
        const periodStart = new Date(now);
        const periodEnd = new Date(now);
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
          logAction('CRON_RESET_ERROR', user.id, { error: updateError.message });
          failureCount++;
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: updateError.message,
          });
        } else {
          logAction('CRON_RESET_SUCCESS', user.id, {
            plan: user.subscription_plan,
            creditsReset: monthlyCredits,
            newPeriodEnd: periodEnd.toISOString(),
          });
          successCount++;
          results.push({
            userId: user.id,
            email: user.email,
            status: 'success',
            plan: user.subscription_plan,
            creditsReset: monthlyCredits,
            newPeriodEnd: periodEnd.toISOString(),
          });
        }
      } catch (error) {
        logAction('CRON_RESET_EXCEPTION', user.id, {
          error: error instanceof Error ? error.message : String(error),
        });
        failureCount++;
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logAction('CRON_MONTHLY_RESET_COMPLETE', -1, {
      total: users.length,
      successful: successCount,
      failed: failureCount,
    });

    return NextResponse.json({
      message: 'Monthly credits reset completed',
      timestamp: now.toISOString(),
      totalProcessed: users.length,
      successful: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error('Cron reset error:', error);
    logAction('CRON_MONTHLY_RESET_FATAL_ERROR', -1, {
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
