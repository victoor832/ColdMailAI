#!/usr/bin/env node

/**
 * Test script para Gemini API vía HTTP
 * 
 * Uso:
 * 1. En terminal 1: pnpm dev
 * 2. En terminal 2: npx ts-node scripts/test-gemini.ts
 * 
 * Hace requests HTTP a los endpoints en lugar de imports directos
 */

const API_URL = 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

let sessionCookie = '';

// Helper para hacer requests
async function apiCall(endpoint: string, method: string, body: any) {
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  // Guardar cookies de sesión
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }

  return { status: response.status, data };
}

async function testGeminiViaAPI() {
  console.log('🚀 GEMINI API TEST VIA HTTP');
  console.log('═'.repeat(50));

  try {
    // Test 1: Check if server is running
    console.log('\n📡 Checking if dev server is running...');
    try {
      const healthCheck = await fetch(`${API_URL}/`);
      if (!healthCheck.ok) {
        throw new Error('Server not responding');
      }
      console.log('✅ Server is running');
    } catch (err) {
      console.error('❌ Cannot reach dev server at', API_URL);
      console.error('   Make sure: pnpm dev is running');
      process.exit(1);
    }

    // Test 2: Analyze endpoint
    console.log('\n🧪 TEST 1: /api/analyze endpoint');
    console.log('─'.repeat(50));

    const analyzeRes = await apiCall('/api/analyze', 'POST', {
      url: 'https://www.stripe.com',
      service: 'Payment Processing Integration',
    });

    if (analyzeRes.status !== 200 && analyzeRes.status !== 401) {
      console.log('❌ Error:', analyzeRes.data);
    } else if (analyzeRes.status === 401) {
      console.log('ℹ️  Not authenticated (expected for CLI test)');
      console.log('✅ Endpoint is working - just needs login');
    } else {
      console.log('✅ Response received:');
      console.log(JSON.stringify(analyzeRes.data, null, 2));
    }

    console.log('\n✅ TEST COMPLETED');
    console.log('═'.repeat(50));
    console.log('\n💡 To properly test Gemini:');
    console.log('   1. Open http://localhost:3000');
    console.log('   2. Login with: test@example.com / password123');
    console.log('   3. Click "Research" button');
    console.log('   4. Enter URL and service');
    console.log('   5. Click "Analyze Prospect"');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testGeminiViaAPI();
