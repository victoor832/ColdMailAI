import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

/**
 * Endpoint para revisar si Stripe tiene configurado el webhook correctamente
 */
export async function GET(req: NextRequest) {
  try {
    // List all webhook endpoints configured on Stripe account
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });

    return NextResponse.json({
      message: 'Webhook endpoints configured on Stripe',
      count: endpoints.data.length,
      endpoints: endpoints.data.map((ep) => ({
        id: ep.id,
        url: ep.url,
        enabled_events: ep.enabled_events,
        status: ep.status,
        api_version: ep.api_version,
      })),
    });
  } catch (error) {
    console.error('Webhook endpoints error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch webhook endpoints',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
