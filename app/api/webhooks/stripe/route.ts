import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserCredits, getCreditsForPlan } from '@/lib/stripe';
import { db } from '@/lib/db';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature')!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;

      if (session.metadata?.userId && session.metadata?.plan) {
        const userId = parseInt(session.metadata.userId);
        const plan = session.metadata.plan;
        const credits = getCreditsForPlan(plan);

        // Update user credits
        await updateUserCredits(userId, credits);

        // Record purchase
        await db.execute({
          sql: `INSERT INTO purchases (user_id, plan, amount, stripe_session_id, status)
                VALUES (?, ?, ?, ?, 'completed')`,
          args: [userId, plan, session.amount_total / 100, session.id],
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
