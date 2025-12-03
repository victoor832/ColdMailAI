import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      );
    }

    const prices: Record<string, { name: string; amount: number; isSubscription: boolean }> = {
      starter: { name: 'Starter Pack', amount: 9, isSubscription: false },
      pro: { name: 'Pro Pack', amount: 19, isSubscription: false },
      unlimited: { name: 'Unlimited', amount: 29, isSubscription: true },
    };

    const planInfo = prices[plan];
    if (!planInfo) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    const session_obj = await createCheckoutSession(
      parseInt(session.user.id),
      planInfo.name,
      planInfo.amount,
      planInfo.isSubscription
    );

    return NextResponse.json({ url: session_obj.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
