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

// In-memory cache for duplicate prevention (simple rate limiting)
// In production, use Redis or similar
const recentWebhookEvents = new Map<string, { timestamp: number; processed: boolean }>();
const WEBHOOK_DEDUP_WINDOW = 5 * 60 * 1000; // 5 minutes

/**
 * Stripe webhook handler for payment events
 * Events: payment_intent.succeeded, payment_intent.payment_failed, customer.subscription.deleted
 */
export async function POST(req: NextRequest) {
  let eventId = '';
  let eventType = '';
  let userId = -1;

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      logAction('WEBHOOK_MISSING_SIGNATURE', -1, { 
        headers: Array.from(req.headers.entries()).map(([k, v]) => k),
      });
      
      // Log to webhook_logs table
      await supabase.from('webhook_logs').insert({
        event_type: 'unknown',
        status: 'failed',
        error_message: 'Missing stripe signature',
        payload: { body: body.substring(0, 500) },
      });

      throw new AppError(401, 'Missing stripe signature', 'MISSING_SIGNATURE');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      if (!webhookSecret) {
        logAction('WEBHOOK_SECRET_NOT_CONFIGURED', -1, {});
        await supabase.from('webhook_logs').insert({
          event_type: 'unknown',
          status: 'failed',
          error_message: 'STRIPE_WEBHOOK_SECRET not configured',
        });
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logAction('STRIPE_SIGNATURE_INVALID', -1, { 
        error: message,
        signatureLength: signature?.length,
      });
      
      await supabase.from('webhook_logs').insert({
        event_type: 'unknown',
        status: 'failed',
        error_message: `Signature validation failed: ${message}`,
        payload: { signature_length: signature?.length },
      });

      throw new AppError(401, `Webhook signature verification failed: ${message}`, 'INVALID_SIGNATURE');
    }

    eventId = event.id;
    eventType = event.type;

    // Check for duplicate events (simple rate limiting)
    const now = Date.now();
    const cachedEvent = recentWebhookEvents.get(eventId);
    
    if (cachedEvent && now - cachedEvent.timestamp < WEBHOOK_DEDUP_WINDOW) {
      if (cachedEvent.processed) {
        logAction('WEBHOOK_DUPLICATE_DETECTED', -1, { eventId, eventType });
        // Return success to avoid Stripe retrying
        return NextResponse.json({ success: true, duplicate: true });
      }
    }
    
    // Mark event as being processed
    recentWebhookEvents.set(eventId, { timestamp: now, processed: false });
    
    // Clean up old entries
    for (const [key, value] of recentWebhookEvents.entries()) {
      if (now - value.timestamp > WEBHOOK_DEDUP_WINDOW) {
        recentWebhookEvents.delete(key);
      }
    }

    logAction('STRIPE_WEBHOOK_RECEIVED', -1, { eventType: event.type, eventId: event.id });

    // Log the event received
    await supabase.from('webhook_logs').insert({
      event_type: eventType,
      event_id: eventId,
      status: 'received',
      payload: { type: event.type },
    });

    // Handle different event types
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'checkout.session.completed':
          // Handle checkout session (when total is 0 due to promo code, no payment_intent)
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          logAction('STRIPE_WEBHOOK_UNHANDLED', -1, { eventType: event.type });
      }
    } catch (handlerError) {
      console.error(`Handler error for event type ${event.type}:`, handlerError);
      logAction('STRIPE_HANDLER_ERROR', -1, { 
        eventType: event.type, 
        error: handlerError instanceof Error ? handlerError.message : String(handlerError)
      });
      // Don't throw - still return success to Stripe to avoid infinite retries
    }

    // Mark event as successfully processed
    if (recentWebhookEvents.has(eventId)) {
      const event = recentWebhookEvents.get(eventId)!;
      event.processed = true;
      recentWebhookEvents.set(eventId, event);
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
 * Uses idempotency to prevent double-processing
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Check if this payment was already processed
    const { data: existingPayment, error: checkError } = await supabase
      .from('payments')
      .select('id, credits_added')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (existingPayment) {
      logAction('PAYMENT_ALREADY_PROCESSED', -1, {
        paymentIntentId: paymentIntent.id,
        creditsAdded: existingPayment.credits_added,
      });
      return; // Already processed, don't process again
    }

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

    logAction('PAYMENT_PROCESSING', user.id, {
      paymentIntentId: paymentIntent.id,
      currentCredits: user.credits,
      creditsToAdd: creditsToAdd,
      expectedNewTotal: user.credits + creditsToAdd,
    });

    // Update user credits - use a direct update with returning
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        credits: user.credits + creditsToAdd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('credits')
      .single();

    if (updateError) {
      logAction('CREDITS_UPDATE_ERROR', user.id, { error: updateError.message });
      throw updateError;
    }

    logAction('CREDITS_UPDATED', user.id, {
      paymentIntentId: paymentIntent.id,
      creditsAdded: creditsToAdd,
      newCredits: updatedUser?.credits || (user.credits + creditsToAdd),
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

/**
 * Handle checkout session completed
 * This is called when checkout.session.completed event is received
 * Simply records the payment without updating user tables
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Only process if payment_status is paid
    if (session.payment_status !== 'paid') {
      logAction('CHECKOUT_SESSION_NOT_PAID', -1, { 
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
      return;
    }

    // Get user ID from metadata - this is a UUID string from auth.users
    const userIdStr = session.metadata?.user_id;

    if (!userIdStr) {
      logAction('CHECKOUT_SESSION_NO_USER_ID', -1, { sessionId: session.id });
      return;
    }

    // Validate it's a UUID format (basic check)
    // UUID format: 8-4-4-4-12 hex digits with hyphens
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdStr)) {
      logAction('CHECKOUT_SESSION_INVALID_UUID', -1, { sessionId: session.id, userIdStr });
      return;
    }

    const userId = userIdStr; // Keep as UUID string

    // Verify user exists in auth.users
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logAction('CHECKOUT_SESSION_USER_NOT_FOUND', -1, { userId, userError: userError?.message });
      return;
    }

    // Get product info from metadata
    const priceId = session.metadata?.stripe_price_id;
    const productId = session.metadata?.stripe_product_id;
    const plan = session.metadata?.plan;

    if (!priceId && !productId) {
      logAction('CHECKOUT_SESSION_NO_PRODUCT_INFO', userId, { sessionId: session.id });
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
      logAction('PRODUCT_NOT_IN_DB', userId, { productId, priceId, productError: productError?.message });
      return;
    }

    const creditsToAdd = product.credit_value;

    logAction('CHECKOUT_SESSION_PROCESSING', userId, {
      sessionId: session.id,
      creditsToAdd,
      plan,
      discount: session.total_details?.amount_discount || 0,
    });

    // Create payment record in payments table with UUID user_id
    const { data: paymentData, error: paymentInsertError } = await supabase
      .from('payments')
      .insert({
        user_id: userId, // UUID string
        stripe_payment_intent_id: session.id,
        stripe_customer_id: (session.customer as string) || '',
        stripe_product_id: productId || null,
        stripe_price_id: priceId || null,
        amount: session.amount_total || 0,
        currency: session.currency || 'eur',
        credits_added: creditsToAdd,
        status: 'succeeded',
        created_at: new Date().toISOString(),
      })
      .select();

    if (paymentInsertError) {
      logAction('PAYMENT_INSERT_FAILED', userId, { 
        error: paymentInsertError.message,
        code: paymentInsertError.code,
      });
      
      // Log failure to webhook_logs
      await supabase.from('webhook_logs').insert({
        event_type: 'checkout.session.completed',
        event_id: session.id,
        status: 'failed',
        user_id: userId,
        error_message: `Payment insert failed: ${paymentInsertError.message}`,
        payload: { session_id: session.id },
      });
      
      return;
    }

    logAction('CHECKOUT_SESSION_COMPLETED', userId, {
      sessionId: session.id,
      creditsAdded: creditsToAdd,
      amountTotal: session.amount_total,
      discount: session.total_details?.amount_discount || 0,
    });

    // Log successful processing to webhook_logs
    await supabase.from('webhook_logs').insert({
      event_type: 'checkout.session.completed',
      event_id: session.id,
      status: 'processed',
      user_id: userId,
      payload: {
        creditsAdded: creditsToAdd,
        sessionId: session.id,
        amountTotal: session.amount_total,
      },
    });

  } catch (error) {
    console.error('Checkout session handler error:', error);
    logAction('CHECKOUT_SESSION_EXCEPTION', -1, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle subscription created or updated
 * When user purchases a subscription plan (Starter, Pro, Unlimited)
 */
async function handleSubscriptionCreatedOrUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    if (!customerId) {
      logAction('SUBSCRIPTION_NO_CUSTOMER', -1, { subscriptionId: subscription.id });
      return;
    }

    // Find user by stripe_customer_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logAction('SUBSCRIPTION_USER_NOT_FOUND', -1, { customerId });
      return;
    }

    // Map subscription status
    const status = subscription.status; // 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    // Get subscription plan from metadata
    const plan = subscription.metadata?.plan || 'unknown';

    // Map plan to monthly credits
    const creditMap: Record<string, number> = {
      starter: 10,
      pro: 25,
      unlimited: 1000000, // 1M credits per month
    };

    const monthlyCredits = creditMap[plan] || 0;

    logAction('SUBSCRIPTION_PROCESSING', user.id, {
      plan,
      status,
      monthlyCredits,
      periodEnd: periodEnd.toISOString(),
    });

    // Update user subscription info
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: status === 'active' || status === 'trialing' ? 'active' : status,
        subscription_plan: plan,
        stripe_subscription_id: subscription.id,
        subscription_current_period_start: periodStart.toISOString(),
        subscription_current_period_end: periodEnd.toISOString(),
        subscription_monthly_credits: monthlyCredits,
        credits: monthlyCredits, // Set credits to monthly allowance
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      logAction('SUBSCRIPTION_UPDATE_ERROR', user.id, { error: updateError.message });
      return;
    }

    logAction('SUBSCRIPTION_UPDATED', user.id, {
      plan,
      monthlyCredits,
      newCredits: monthlyCredits,
    });

    // Log to webhook_logs
    await supabase.from('webhook_logs').insert({
      event_type: 'customer.subscription.updated',
      event_id: subscription.id,
      status: 'processed',
      user_id: user.id,
      payload: {
        plan,
        monthlyCredits,
        subscriptionStatus: status,
      },
    });
  } catch (error) {
    console.error('Subscription handler error:', error);
    logAction('SUBSCRIPTION_EXCEPTION', -1, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
