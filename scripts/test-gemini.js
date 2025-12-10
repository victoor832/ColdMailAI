#!/usr/bin/env node
/**
 * Test Gemini API connection and model availability
 * Usage: node scripts/test-gemini.js
 */

const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.trim()) return;
  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  if (key && value) {
    env[key.trim()] = value;
  }
});

Object.assign(process.env, env);

async function testGemini() {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in .env');
      process.exit(1);
    }
    
    console.log('✅ GEMINI_API_KEY found');
    console.log('🔑 Key (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test with gemini-1.5-flash (our new model)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 1,
      },
    });
    
    console.log('\n🧪 Testing gemini-1.5-flash...');
    const testPrompt = 'Return this JSON exactly: {"test": "success"}';
    const result = await model.generateContent(testPrompt);
    const text = result.response.text();
    
    console.log('✅ API Response received');
    console.log('📝 Response (first 200 chars):', text.substring(0, 200));
    
    // Try parsing
    try {
      const json = JSON.parse(text);
      console.log('✅ JSON parsed successfully:', json);
    } catch (e) {
      console.log('⚠️  Could not parse JSON:', e.message);
      console.log('📋 Full response:', text);
    }
    
    console.log('\n✅ Gemini API is working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

testGemini();
