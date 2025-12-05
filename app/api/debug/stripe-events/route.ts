import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Debug: Check Stripe events for debugging
 */
export async function GET(req: NextRequest) {
  try {
    const sessionId = 'cs_live_b1P8l1K2xhMwHiVTN3HI4WM4vGGPVt5hl52bcuKYg4pr0ehpsnfH2mVWS7';

    // Get the session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Get events related to this session
    const events = await stripe.events.list({
      limit: 100,
      type: 'checkout.session.completed',
    });

    const relevantEvents = events.data.filter((e) => {
      const obj = e.data.object as any;
      return obj.id === sessionId;
    });

    return NextResponse.json({
      session: {
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        metadata: session.metadata,
        customer: session.customer,
      },
      events: relevantEvents.map((e) => ({
        id: e.id,
        type: e.type,
        created: e.created,
        request_id: e.request?.id,
      })),
      count: relevantEvents.length,
    });
  } catch (error) {
    console.error('Events check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check events',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
