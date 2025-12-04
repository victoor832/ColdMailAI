#!/usr/bin/env node

/**
 * Test /api/analyze endpoint
 * Verifies that credits are deducted after analysis
 */

const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && !key.startsWith('#')) {
    envVars[key.trim()] = value?.trim().replace(/^"|"$/g, '');
  }
});

Object.assign(process.env, envVars);

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAnalyzeEndpoint() {
  try {
    console.log('🧪 Testing /api/analyze endpoint\n');

    // 1. Get user initial credits
    console.log('1️⃣  Fetching user initial credits...');
    const { data: userBefore } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('id', 1)
      .single();

    console.log(`   ✅ User: ${userBefore.email}`);
    console.log(`   💳 Credits before: ${userBefore.credits}\n`);

    // 2. Call /api/analyze endpoint
    console.log('2️⃣  Calling POST /api/analyze...');
    const analyzeResponse = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://www.example.com',
        userId: 1,
      }),
    });

    const analyzeData = await analyzeResponse.json();
    console.log(`   Status: ${analyzeResponse.status}`);
    
    if (!analyzeResponse.ok) {
      console.log(`   ❌ Error: ${analyzeData.error || 'Unknown error'}`);
      return;
    }

    console.log(`   ✅ Analysis complete`);
    console.log(`   📊 Result preview: ${analyzeData.analysis?.substring(0, 100)}...\n`);

    // 3. Get user final credits
    console.log('3️⃣  Fetching user final credits...');
    const { data: userAfter } = await supabase
      .from('users')
      .select('id, email, credits')
      .eq('id', 1)
      .single();

    console.log(`   💳 Credits after: ${userAfter.credits}`);
    
    const deducted = userBefore.credits - userAfter.credits;
    console.log(`   ➖ Credits deducted: ${deducted}\n`);

    // 4. Verify
    if (deducted > 0) {
      console.log('✅ SUCCESS: Credits were deducted!');
      console.log(`   Deducted: ${deducted} credits`);
      console.log(`   New balance: ${userAfter.credits}`);
    } else {
      console.log('⚠️  WARNING: No credits were deducted!');
      console.log(`   Balance remained: ${userAfter.credits}`);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error(error);
  }
}

testAnalyzeEndpoint();
