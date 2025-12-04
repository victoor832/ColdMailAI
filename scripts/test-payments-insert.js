#!/usr/bin/env node

/**
 * Test direct insert into payments table
 * Uses SERVICE_ROLE_KEY to bypass RLS
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPaymentInsert() {
  try {
    console.log('🧪 Testing payments table insert...\n');

    // Try to insert a test payment record
    const testRecord = {
      user_id: 1,
      stripe_payment_intent_id: 'pi_test_' + Date.now(),
      stripe_customer_id: 'cus_test_' + Date.now(),
      stripe_product_id: 'prod_test',
      stripe_price_id: 'price_test',
      amount: 1000,
      currency: 'usd',
      credits_added: 10,
      status: 'test',
    };

    console.log('📝 Inserting record:');
    console.log(testRecord);
    console.log();

    const { data, error } = await supabase
      .from('payments')
      .insert([testRecord])
      .select();

    if (error) {
      console.error('❌ Insert failed:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      return;
    }

    console.log('✅ Insert succeeded!');
    console.log('Data:', data);

    // Verify the record exists
    console.log('\n🔍 Verifying record exists...');
    const { data: records, error: readError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', testRecord.stripe_payment_intent_id);

    if (readError) {
      console.error('❌ Read failed:', readError.message);
      return;
    }

    console.log('✅ Record found:', records.length > 0 ? 'YES' : 'NO');
    if (records.length > 0) {
      console.log('Record:', records[0]);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error);
  }
}

testPaymentInsert();
