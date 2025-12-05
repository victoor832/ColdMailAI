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

      case 'checkout.session.completed':
        // Handle checkout session (when total is 0 due to promo code, no payment_intent)
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
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
 * (e.g., when total is 0 due to promo code, no payment_intent is created)
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

    // Get user ID from metadata
    const userIdStr = session.metadata?.user_id;

    if (!userIdStr) {
      logAction('CHECKOUT_SESSION_NO_USER_ID', -1, { sessionId: session.id });
      return;
    }

    const userId = parseInt(userIdStr);

    if (isNaN(userId)) {
      logAction('CHECKOUT_SESSION_INVALID_USER_ID', -1, { sessionId: session.id, userIdStr });
      return;
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logAction('CHECKOUT_SESSION_USER_NOT_FOUND', -1, { userId });
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get product info from metadata
    const priceId = session.metadata?.stripe_price_id;
    const productId = session.metadata?.stripe_product_id;
    const plan = session.metadata?.plan;

    if (!priceId && !productId) {
      logAction('CHECKOUT_SESSION_NO_PRODUCT_INFO', user.id, { sessionId: session.id });
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
      throw new AppError(404, 'Product mapping not found', 'PRODUCT_NOT_FOUND');
    }

    const creditsToAdd = product.credit_value;

    logAction('CHECKOUT_SESSION_PROCESSING', user.id, {
      sessionId: session.id,
      currentCredits: user.credits,
      creditsToAdd,
      plan,
      discount: session.total_details?.amount_discount || 0,
    });

    // Update user credits
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

    logAction('CHECKOUT_SESSION_CREDITS_ADDED', user.id, {
      sessionId: session.id,
      creditsAdded: creditsToAdd,
      newCredits: updatedUser?.credits || (user.credits + creditsToAdd),
      amountTotal: session.amount_total,
      discount: session.total_details?.amount_discount || 0,
    });

    // Create payment record in payments table
    const { error: paymentInsertError } = await supabase.from('payments').insert({
      user_id: user.id,
      stripe_payment_intent_id: session.id, // Use session ID as reference
      stripe_customer_id: session.customer as string || '',
      stripe_product_id: productId || null,
      stripe_price_id: priceId || null,
      amount: session.amount_total || 0,
      currency: session.currency || 'eur',
      credits_added: creditsToAdd,
      status: 'succeeded',
      created_at: new Date().toISOString(),
    });

    if (paymentInsertError) {
      logAction('PAYMENT_INSERT_FAILED', user.id, { error: paymentInsertError.message });
      throw paymentInsertError;
    }
  } catch (error) {
    console.error('Checkout session handler error:', error);
    throw error;
  }
}
