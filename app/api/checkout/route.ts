import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { AppError, handleError, logAction } from '@/lib/error-handler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map plan to Stripe product/price IDs
const PLAN_MAPPING = {
  starter: {
    productId: 'prod_TXTkYzi88BPDuj',
    priceId: 'price_1SaOmf8WNN2WVhxAiNIFJeh7',
    name: 'Starter Pack (10 credits)',
  },
  pro: {
    productId: 'prod_TXTl3bWMgFAott',
    priceId: 'price_1SaOnV8WNN2WVhxANn4dQ7Ub',
    name: 'Pro Pack (25 credits)',
  },
  unlimited: {
    productId: 'prod_TXTmV6qQoKYc4N',
    priceId: 'price_1SaOoz8WNN2WVhxA1exVFvOs',
    name: 'Unlimited (999,999 credits)',
  },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { plan } = body;

    // Validate plan
    if (!plan || !PLAN_MAPPING[plan as keyof typeof PLAN_MAPPING]) {
      throw new AppError(400, `Invalid plan. Must be one of: ${Object.keys(PLAN_MAPPING).join(', ')}`, 'INVALID_PLAN');
    }

    const planInfo = PLAN_MAPPING[plan as keyof typeof PLAN_MAPPING];

    // Get or create Stripe customer for user
    let customerId: string;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // If user already has a Stripe customer ID, use it
    if (user.stripe_customer_id) {
      customerId = user.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId.toString(),
        },
      });

      customerId = customer.id;

      // Save customer ID to user
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planInfo.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId.toString(),
        user_id: userId.toString(), // Include both formats for compatibility
        plan,
        stripe_product_id: planInfo.productId,
        stripe_price_id: planInfo.priceId,
      },
      allow_promotion_codes: true, // Allow coupon/promo codes
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      payment_intent_data: {
        metadata: {
          userId: userId.toString(),
          user_id: userId.toString(),
          plan,
          stripe_product_id: planInfo.productId,
          stripe_price_id: planInfo.priceId,
        },
      },
    });

    logAction('CHECKOUT_SESSION_CREATED', userId, {
      plan,
      sessionId: checkoutSession.id,
      productId: planInfo.productId,
      customerId,
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof AppError) {
      return handleError(error);
    }

    return handleError(
      new AppError(500, 'Failed to create checkout session', 'CHECKOUT_ERROR')
    );
  }
}
