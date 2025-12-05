import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint - in-memory webhook tracking
 * Note: This only works for single instance, in production use a proper logging service
 */
let webhookAttempts: any[] = [];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Webhook logs are stored in Vercel logs. Check Vercel Dashboard > Functions or Logs tab.',
    note: 'To see webhook processing, check the recent payment-status endpoint or look at Stripe Dashboard webhook events.',
    tracking: {
      attempts: webhookAttempts.length,
      recent: webhookAttempts.slice(-10),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    webhookAttempts.push({
      timestamp: new Date().toISOString(),
      data,
    });

    // Keep only last 100
    if (webhookAttempts.length > 100) {
      webhookAttempts = webhookAttempts.slice(-100);
    }

    return NextResponse.json({ logged: true });
  } catch {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
