import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Debug endpoint to simulate webhook processing
 * POST with checkout session data
 */
export async function POST(req: NextRequest) {
  try {
    // Use the exact checkout session from the webhook event
    const session: Stripe.Checkout.Session = {
      id: 'cs_live_b1P8l1K2xhMwHiVTN3HI4WM4vGGPVt5hl52bcuKYg4pr0ehpsnfH2mVWS7',
      object: 'checkout.session',
      payment_status: 'paid',
      metadata: {
        user_id: '1',
        plan: 'starter',
        stripe_product_id: 'prod_TXTkYzi88BPDuj',
        userId: '1',
        stripe_price_id: 'price_1SaOmf8WNN2WVhxAiNIFJeh7',
      },
      amount_total: 0,
      currency: 'eur',
      customer: 'cus_TXUtJu7L2wLAZH',
      total_details: {
        amount_discount: 900,
        amount_shipping: 0,
        amount_tax: 0,
      },
    } as any;

    const logs: string[] = [];

    logs.push('Step 1: Check payment status');
    if (session.payment_status !== 'paid') {
      logs.push(`❌ Payment not paid: ${session.payment_status}`);
      return NextResponse.json({ logs, error: 'Payment not paid' });
    }
    logs.push('✅ Payment status is paid');

    logs.push('\nStep 2: Extract user ID from metadata');
    const userIdStr = session.metadata?.user_id;
    if (!userIdStr) {
      logs.push('❌ No user_id in metadata');
      return NextResponse.json({ logs, error: 'No user_id' });
    }
    logs.push(`✅ Found user_id: ${userIdStr}`);

    const userId = parseInt(userIdStr);
    if (isNaN(userId)) {
      logs.push(`❌ Invalid user ID (NaN): ${userIdStr}`);
      return NextResponse.json({ logs, error: 'Invalid user ID' });
    }
    logs.push(`✅ Parsed userId as integer: ${userId}`);

    logs.push('\nStep 3: Query user from database');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('id', userId)
      .single();

    if (userError) {
      logs.push(`❌ User query error: ${userError.message}`);
      return NextResponse.json({ logs, error: userError.message });
    }

    if (!user) {
      logs.push(`❌ User not found for ID: ${userId}`);
      return NextResponse.json({ logs, error: 'User not found' });
    }

    logs.push(`✅ Found user: ${user.email} with credits: ${user.credits}`);

    logs.push('\nStep 4: Get product info');
    const priceId = session.metadata?.stripe_price_id;
    const productId = session.metadata?.stripe_product_id;
    logs.push(`✅ Price ID: ${priceId}`);
    logs.push(`✅ Product ID: ${productId}`);

    if (!priceId && !productId) {
      logs.push('❌ Neither priceId nor productId found');
      return NextResponse.json({ logs, error: 'No product info' });
    }

    logs.push('\nStep 5: Query stripe_products table');
    let query = supabase.from('stripe_products').select('credit_value');

    if (priceId) {
      query = query.eq('stripe_price_id', priceId);
    } else if (productId) {
      query = query.eq('stripe_product_id', productId);
    }

    const { data: product, error: productError } = await query.single();

    if (productError) {
      logs.push(`❌ Product query error: ${productError.message}`);
      return NextResponse.json({ logs, error: productError.message });
    }

    if (!product) {
      logs.push(`❌ Product not found for priceId: ${priceId}, productId: ${productId}`);
      return NextResponse.json({ logs, error: 'Product not found' });
    }

    logs.push(`✅ Found product with credit_value: ${product.credit_value}`);

    const creditsToAdd = product.credit_value;
    const newCredits = user.credits + creditsToAdd;

    logs.push('\nStep 6: Update user credits');
    logs.push(`  Current credits: ${user.credits}`);
    logs.push(`  Credits to add: ${creditsToAdd}`);
    logs.push(`  New credits total: ${newCredits}`);

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('credits')
      .single();

    if (updateError) {
      logs.push(`❌ Update error: ${updateError.message}`);
      return NextResponse.json({ logs, error: updateError.message });
    }

    logs.push(`✅ Credits updated successfully`);
    logs.push(`   Updated user credits: ${updatedUser?.credits}`);

    logs.push('\nStep 7: Insert payment record');
    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        stripe_payment_intent_id: session.id,
        stripe_customer_id: (session.customer as string) || '',
        stripe_product_id: productId || null,
        stripe_price_id: priceId || null,
        amount: session.amount_total || 0,
        currency: session.currency || 'eur',
        credits_added: creditsToAdd,
        status: 'succeeded',
        created_at: new Date().toISOString(),
      });

    if (paymentInsertError) {
      logs.push(`❌ Payment insert error: ${paymentInsertError.message}`);
      return NextResponse.json({ logs, error: paymentInsertError.message });
    }

    logs.push(`✅ Payment record created`);

    logs.push('\n🎉 WEBHOOK SIMULATION SUCCESSFUL');
    return NextResponse.json({ logs, success: true, newCredits });
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
