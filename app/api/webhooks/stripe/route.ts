import { NextRequest, NextResponse } from 'next/server';
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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Stripe webhook handler for payment events
 * Events: payment_intent.succeeded, payment_intent.payment_failed, customer.subscription.deleted
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new AppError(401, 'Missing stripe signature', 'MISSING_SIGNATURE');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logAction('STRIPE_SIGNATURE_INVALID', -1, { error: message });
      throw new AppError(401, `Webhook signature verification failed: ${message}`, 'INVALID_SIGNATURE');
    }

    logAction('STRIPE_WEBHOOK_RECEIVED', -1, { eventType: event.type, eventId: event.id });

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        logAction('STRIPE_WEBHOOK_UNHANDLED', -1, { eventType: event.type });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    if (error instanceof AppError) {
      return handleError(error);
    }

    return handleError(new AppError(500, 'Webhook processing failed', 'WEBHOOK_ERROR'));
  }
}

/**
 * Handle successful payment
 * Extracts product info and credits, updates user
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Get customer ID - may not exist in test events
    const customerId = paymentIntent.customer as string | null;
    
    // Try to get user ID from metadata first (more reliable for test/production)
    let userId: string | null = paymentIntent.metadata?.user_id || null;
    let user = null;

    // If no user_id in metadata, try to find by customer ID
    if (!userId && customerId) {
      const { data: foundUser } = await supabase
        .from('users')
        .select('id, email, credits')
        .eq('stripe_customer_id', customerId)
        .single();
      
      if (foundUser) {
        user = foundUser;
        userId = foundUser.id;
      }
    } else if (userId) {
      // Fetch user by ID
      const { data: foundUser } = await supabase
        .from('users')
        .select('id, email, credits')
        .eq('id', userId)
        .single();
      
      if (foundUser) {
        user = foundUser;
      }
    }

    // If still no user found and no customer ID, log and skip (test event)
    if (!user) {
      if (!customerId && !userId) {
        logAction('STRIPE_WEBHOOK_SKIPPED', -1, { 
          paymentIntentId: paymentIntent.id,
          reason: 'No customer or user ID in test event'
        });
        return;
      }
      
      logAction('PAYMENT_USER_NOT_FOUND', -1, { customerId, userId });
      throw new AppError(404, 'User not found for this payment', 'USER_NOT_FOUND');
    }

    // Get product/price info from payment intent metadata or line items
    let productId: string | null = null;
    let priceId: string | null = null;

    // Try to get from metadata
    if (paymentIntent.metadata?.stripe_product_id) {
      productId = paymentIntent.metadata.stripe_product_id;
    }
    if (paymentIntent.metadata?.stripe_price_id) {
      priceId = paymentIntent.metadata.stripe_price_id;
    }

    if (!productId && !priceId) {
      // For test events without product info, just log and return
      logAction('PAYMENT_NO_PRODUCT_INFO', userId ? parseInt(userId) : -1, { 
        paymentIntentId: paymentIntent.id,
        note: 'Test event without product mapping'
      });
      return;
    }

    // Query stripe_products table for credits
    let query = supabase.from('stripe_products').select('credit_value');

    if (priceId) {
      query = query.eq('stripe_price_id', priceId);
    } else if (productId) {
      query = query.eq('stripe_product_id', productId);
    }

    const { data: product, error: productError } = await query.single();

    if (productError || !product) {
      logAction('PRODUCT_NOT_IN_DB', user.id, { productId, priceId });
      throw new AppError(404, 'Product mapping not found in database', 'PRODUCT_NOT_FOUND');
    }

    const creditsToAdd = product.credit_value;

    // Update user credits
    const newCredits = user.credits + creditsToAdd;
    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Log successful payment
    logAction('PAYMENT_SUCCESS', user.id, {
      paymentIntentId: paymentIntent.id,
      productId,
      priceId,
      creditsAdded: creditsToAdd,
      newTotal: newCredits,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });

    // Create payment record in payments table
    const { error: paymentInsertError } = await supabase.from('payments').insert({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: customerId || '', // Empty string if null (for test events)
      stripe_product_id: productId,
      stripe_price_id: priceId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      credits_added: creditsToAdd,
      status: 'succeeded',
      created_at: new Date().toISOString(),
    });

    if (paymentInsertError) {
      logAction('PAYMENT_INSERT_FAILED', user.id, { error: paymentInsertError.message });
      throw paymentInsertError;
    }
  } catch (error) {
    console.error('Payment success handler error:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 * Log for debugging
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const customerId = paymentIntent.customer as string;

    logAction('PAYMENT_FAILED', -1, {
      paymentIntentId: paymentIntent.id,
      customerId,
      lastPaymentError: paymentIntent.last_payment_error?.message,
      amount: paymentIntent.amount,
    });

    // Optional: Find user and send notification
    if (customerId) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('stripe_customer_id', customerId)
        .single();

      if (user) {
        // TODO: Send email notification about failed payment
        logAction('PAYMENT_FAILED_USER_NOTIFIED', user.id, {
          email: user.email,
          reason: paymentIntent.last_payment_error?.message,
        });
      }
    }
  } catch (error) {
    console.error('Payment failed handler error:', error);
    throw error;
  }
}

/**
 * Handle subscription deletion
 * Log for auditing
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    if (customerId) {
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('stripe_customer_id', customerId)
        .single();

      if (user) {
        logAction('SUBSCRIPTION_DELETED', user.id, {
          stripeSubscriptionId: subscription.id,
          email: user.email,
        });

        // Optional: Update user subscription status
        await supabase
          .from('users')
          .update({ stripe_subscription_id: null })
          .eq('id', user.id);
      }
    }
  } catch (error) {
    console.error('Subscription deletion handler error:', error);
    throw error;
  }
}
