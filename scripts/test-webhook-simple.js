#!/usr/bin/env node
/**
 * Test Stripe Webhook
 * Usage: node scripts/test-webhook-simple.js
 */

const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  // Skip comments and empty lines
  if (line.startsWith('#') || !line.trim()) return;
  
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  
  if (key && value) {
    env[key.trim()] = value;
  }
});

// Set environment variables
Object.assign(process.env, env);

// Now load the modules
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  try {
    console.log('🧪 Testing Stripe Webhook Integration\n');

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in .env');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not found in .env');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not found in .env');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('1️⃣  Fetching test user...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, credits, stripe_customer_id')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found.');
      console.error('   Please register first at http://localhost:3000/auth/signup');
      process.exit(1);
    }

    const testUser = users[0];
    console.log(`   ✅ Found user: ${testUser.email} (ID: ${testUser.id})`);
    console.log(`   📊 Current credits: ${testUser.credits}`);
    console.log('');

    console.log('2️⃣  Creating/Getting Stripe customer...');
    let customerId = testUser.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: testUser.email,
        metadata: { userId: testUser.id.toString() },
      });
      customerId = customer.id;

      // Save to user
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', testUser.id);

      if (updateError) throw updateError;

      console.log(`   ✅ Created customer: ${customerId}`);
    } else {
      console.log(`   ✅ Using existing customer: ${customerId}`);
    }
    console.log('');

    console.log('3️⃣  Fetching product mappings...');
    const { data: products, error: productsError } = await supabase
      .from('stripe_products')
      .select('stripe_price_id, stripe_product_id, credit_value');

    if (productsError || !products || products.length === 0) {
      console.error('❌ No products found in stripe_products table.');
      console.error('   Please execute: psql < schema.stripe.sql');
      process.exit(1);
    }

    const testProduct = products[0];
    console.log(`   ✅ Using product: ${testProduct.stripe_product_id}`);
    console.log(`   📦 Credits: ${testProduct.credit_value}`);
    console.log('');

    console.log('4️⃣  Creating test payment intent...');
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
    console.log('');

    console.log('5️⃣  Confirming payment intent...');
    
    // For live keys, we need to create a test payment method differently
    // Instead, we'll just create the payment intent and let Stripe CLI simulate the webhook
    console.log(`   ℹ️  Payment intent created: ${paymentIntent.id}`);
    console.log(`   ℹ️  Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
    console.log('');

    console.log('6️⃣  Webhook will be simulated...');
    console.log('   📌 Run this in another terminal:');
    console.log(`   stripe trigger payment_intent.succeeded --override metadata.user_id=${testUser.id} metadata.stripe_product_id=${testProduct.stripe_product_id} metadata.stripe_price_id=${testProduct.stripe_price_id}`);
    console.log('');
    console.log('   Or use Stripe CLI to check the latest events:');
    console.log('   stripe events list --limit 5');
    console.log('');

    // Wait a bit for webhook to process
    console.log('⏳ Waiting 2 seconds for webhook processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('');
    console.log('7️⃣  Checking user credits after webhook...');
    const { data: updatedUser, error: checkError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', testUser.id)
      .single();

    if (checkError) throw checkError;
    if (updatedUser) {
      const creditsAdded = updatedUser.credits - testUser.credits;
      console.log(`   💳 Original credits: ${testUser.credits}`);
      console.log(`   ➕ Credits added: ${creditsAdded}`);
      console.log(`   ✅ Total credits: ${updatedUser.credits}`);

      if (creditsAdded > 0) {
        console.log('');
        console.log('🎉 Webhook processing successful!');
      } else {
        console.log('');
        console.log('⚠️  No credits added. Check dev server logs for errors.');
      }
    }

    console.log('');
    console.log('✨ Test complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
