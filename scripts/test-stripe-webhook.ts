#!/usr/bin/env ts-node
/**
 * Test Stripe webhook with a real user
 * Usage: pnpm exec ts-node scripts/test-stripe-webhook.ts
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  try {
    console.log('🧪 Testing Stripe Webhook Integration\n');

    // Step 1: Get a test user or create one
    console.log('1️⃣  Fetching test user...');
    const { data: users } = await supabase
      .from('users')
      .select('id, email, credits, stripe_customer_id')
      .limit(1);

    if (!users || users.length === 0) {
      console.error('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`   ✅ Found user: ${testUser.email} (ID: ${testUser.id})`);
    console.log(`   📊 Current credits: ${testUser.credits}`);

    // Step 2: Create or get Stripe customer
    console.log('\n2️⃣  Creating/Getting Stripe customer...');
    let customerId = testUser.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: testUser.email,
        metadata: { userId: testUser.id.toString() },
      });
      customerId = customer.id;

      // Save to user
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', testUser.id);

      console.log(`   ✅ Created customer: ${customerId}`);
    } else {
      console.log(`   ✅ Using existing customer: ${customerId}`);
    }

    // Step 3: Get products mapping
    console.log('\n3️⃣  Fetching product mappings...');
    const { data: products } = await supabase
      .from('stripe_products')
      .select('stripe_price_id, stripe_product_id, credit_value');

    if (!products || products.length === 0) {
      console.error('❌ No products found in stripe_products table.');
      console.error('   Please run: psql < schema.stripe.sql');
      process.exit(1);
    }

    const testProduct = products[0];
    console.log(`   ✅ Using product: ${testProduct.stripe_product_id}`);
    console.log(`   📦 Credits: ${testProduct.credit_value}`);

    // Step 4: Create payment intent
    console.log('\n4️⃣  Creating test payment intent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // $10.00
      currency: 'usd',
      customer: customerId,
      metadata: {
        user_id: testUser.id.toString(),
        stripe_product_id: testProduct.stripe_product_id,
        stripe_price_id: testProduct.stripe_price_id,
      },
      payment_method_types: ['card'],
    });

    console.log(`   ✅ Created payment intent: ${paymentIntent.id}`);
    console.log(`   💰 Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);

    // Step 5: Confirm payment intent
    console.log('\n5️⃣  Confirming payment intent...');
    const confirmedIntent = await stripe.paymentIntents.confirm(
      paymentIntent.id,
      {
        payment_method: 'pm_card_visa', // Test card
        return_url: 'http://localhost:3000',
      }
    );

    console.log(`   ✅ Payment status: ${confirmedIntent.status}`);

    // Step 6: Check webhook processing
    console.log('\n6️⃣  Webhook will be processed by Stripe CLI listener...');
    console.log('   Make sure you have: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
    console.log('   Check the dev server logs for webhook events.');

    // Wait a bit for webhook to process
    console.log('\n⏳ Waiting 2 seconds for webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 7: Check user credits
    console.log('\n7️⃣  Checking user credits after webhook...');
    const { data: updatedUser } = await supabase
      .from('users')
      .select('credits')
      .eq('id', testUser.id)
      .single();

    if (updatedUser) {
      const creditsAdded = updatedUser.credits - testUser.credits;
      console.log(`   💳 Original credits: ${testUser.credits}`);
      console.log(`   ➕ Credits added: ${creditsAdded}`);
      console.log(`   ✅ Total credits: ${updatedUser.credits}`);

      if (creditsAdded > 0) {
        console.log('\n🎉 Webhook processing successful!');
      } else {
        console.log('\n⚠️  No credits added. Check dev server logs for errors.');
      }
    }

    // Step 8: Show payment record
    console.log('\n8️⃣  Payment audit log:');
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (payments && payments.length > 0) {
      console.log(`   ✅ Payment record created`);
      console.log(`   Status: ${payments[0].status}`);
      console.log(`   Credits: ${payments[0].credits_added}`);
    }

    console.log('\n✨ Test complete!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
