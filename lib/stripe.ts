import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(
  userId: string, // UUID from auth.users
  planName: string,
  amount: number,
  isSubscription: boolean,
  priceId?: string
) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const lineItems = isSubscription && priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{ price_data: { currency: 'usd', unit_amount: Math.round(amount * 100), product_data: { name: planName } }, quantity: 1 }];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        userId: userId, // UUID string
        user_id: userId, // UUID string
        plan: planName,
      },
    });

    return session;
  } catch (error) {
    console.error('Create checkout session error:', error);
    throw error;
  }
}

export function getCreditsForPlan(plan: string): number {
  const creditsMap: Record<string, number> = {
    'starter': 10,
    'pro': 25,
    'unlimited': 999999,
    'lifetime': 999999,
  };
  return creditsMap[plan] || 0;
}

export async function updateUserCredits(userId: string, creditsToAdd: number) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('users')
      .update({ credits: supabase.rpc('increment_by', { increment_by: creditsToAdd }) })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Update credits error:', error);
    throw error;
  }
}
