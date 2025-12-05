import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { logAction } from '@/lib/error-handler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * Handle subscription created/updated
 * Stripe sends customer.subscription.created and customer.subscription.updated events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, subscription, user_id } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'Missing subscription data' }, { status: 400 });
    }

    const customerId = subscription.customer;

    // Find user by stripe_customer_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logAction('SUBSCRIPTION_USER_NOT_FOUND', -1, { customerId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Map subscription status
    const status = subscription.status; // 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    // Get subscription plan from Stripe metadata
    const plan = subscription.metadata?.plan || 'unknown';

    // Map plan to monthly credits
    const creditMap: Record<string, number | null> = {
      starter: 10,
      pro: 25,
      unlimited: null, // null = unlimited
    };

    const monthlyCredits = plan in creditMap ? creditMap[plan] : 0;

    // Update user subscription info
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: status === 'active' || status === 'trialing' ? 'active' : status,
        subscription_plan: plan,
        stripe_subscription_id: subscription.id,
        subscription_current_period_start: periodStart.toISOString(),
        subscription_current_period_end: plan === 'unlimited' ? null : periodEnd.toISOString(),
        subscription_monthly_credits: monthlyCredits === null ? null : (monthlyCredits as number),
        credits: monthlyCredits, // null for unlimited, number for others
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      logAction('SUBSCRIPTION_UPDATE_ERROR', user.id, { error: updateError.message });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    logAction('SUBSCRIPTION_UPDATED', user.id, {
      status,
      plan,
      monthlyCredits,
      periodEnd: periodEnd.toISOString(),
    });

    return NextResponse.json({ success: true, updated: true });
  } catch (error) {
    console.error('Subscription handler error:', error);
    return NextResponse.json(
      {
        error: 'Failed to handle subscription',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
