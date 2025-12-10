#!/usr/bin/env node
/**
 * List available Gemini models
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

async function listModels() {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log('📋 Listing available Gemini models...\n');
    
    // This API method lists models
    const response = await genAI.listModels?.();
    console.log('Available models:', response);
    
  } catch (error) {
    console.log('Method not available in this SDK version');
    console.log('\nTrying with common model names...');
    console.log('- gemini-pro');
    console.log('- gemini-1.0-pro');
    console.log('- gemini-1.5-pro');
    console.log('- gemini-2.0-flash');
  }
}

listModels();
