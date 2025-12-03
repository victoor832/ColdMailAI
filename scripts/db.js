#!/usr/bin/env node

/**
 * Database initialization script
 * Run this before starting the app for the first time
 */

import { initializeDatabase } from './lib/db';

async function main() {
  try {
    console.log('🚀 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();
