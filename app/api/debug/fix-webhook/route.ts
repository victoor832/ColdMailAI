import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

/**
 * Fix webhook configuration - add checkout.session.completed to the main endpoint
 */
export async function POST(req: NextRequest) {
  try {
    // Update the main webhook endpoint to include checkout.session.completed
    const mainWebhookId = 'we_1SaP0U8WNN2WVhxA4ejoiTsg'; // The correct endpoint

    const updated = await stripe.webhookEndpoints.update(mainWebhookId, {
      enabled_events: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'customer.subscription.updated',
        'invoice.paid',
        'checkout.session.completed', // ADD THIS
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook updated successfully',
      endpoint: {
        id: updated.id,
        url: updated.url,
        enabled_events: updated.enabled_events,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('Webhook update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update webhook',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET to verify current configuration
 */
export async function GET(req: NextRequest) {
  try {
    const mainWebhookId = 'we_1SaP0U8WNN2WVhxA4ejoiTsg';
    const endpoint = await stripe.webhookEndpoints.retrieve(mainWebhookId);

    return NextResponse.json({
      id: endpoint.id,
      url: endpoint.url,
      enabled_events: endpoint.enabled_events,
      status: endpoint.status,
      hasCheckoutSessionEvent: endpoint.enabled_events?.includes('checkout.session.completed'),
    });
  } catch (error) {
    console.error('Webhook check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check webhook',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
