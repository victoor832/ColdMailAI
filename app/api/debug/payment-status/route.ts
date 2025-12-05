import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppError, handleError } from '@/lib/error-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Debug endpoint to check webhook and payment status
 * This is for debugging payment issues in production
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, credits, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    // Get recent payments for this user
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Get stripe products configuration
    const { data: products, error: productsError } = await supabase
      .from('stripe_products')
      .select('*');

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        credits: user.credits,
        stripe_customer_id: user.stripe_customer_id,
      },
      recentPayments: payments || [],
      stripeProducts: products || [],
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '***configured***' : '❌ NOT CONFIGURED',
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return handleError(error);
  }
}
