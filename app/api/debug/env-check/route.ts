import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug: Check webhook secret configuration
 */
export async function GET(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  return NextResponse.json({
    hasSecret: !!secret,
    secretLength: secret?.length || 0,
    secretPrefix: secret ? secret.substring(0, 10) + '***' : 'NOT_SET',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    },
  });
}
