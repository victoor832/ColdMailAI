import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, subscription_plan, credits')
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Sample users:');
    console.table(users);
  }
}

main();
