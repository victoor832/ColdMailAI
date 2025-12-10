#!/usr/bin/env node

/**
 * Run subscription plan migration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  try {
    console.log('🚀 Running subscription plan migration...');

    // Note: ALTER TABLE with DEFAULT might need manual execution in Supabase console
    console.log('Note: ALTER TABLE for DEFAULT value should be run manually in Supabase SQL editor');
    console.log('SQL: ALTER TABLE users ALTER COLUMN subscription_plan SET DEFAULT \'free\';');

    // Update existing users without subscription_plan
    console.log('Updating existing users without subscription_plan...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ subscription_plan: 'free' })
      .is('subscription_plan', null);

    if (updateError) {
      console.error('❌ Migration failed:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
