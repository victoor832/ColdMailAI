import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCredits } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import {
  handleError,
  AppError,
  logAction,
  withRetry,
} from '@/lib/error-handler';

// Force dynamic rendering (required because we use getServerSession)
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new AppError(401, 'Unauthorized. Please log in.', 'UNAUTHORIZED');
    }

    const userId = parseInt(session.user.id);

    // Fetch credits with retry
    let credits: number | null = 0;
    try {
      credits = await withRetry(() => getUserCredits(userId), 2);
    } catch (error) {
      logAction('GET_CREDITS_FAILED', userId, { error: String(error) });
      throw new AppError(
        500,
        'Failed to fetch credits. Please try again.',
        'CREDITS_FETCH_ERROR'
      );
    }

    // Fetch user responses count
    let responsesCount = 0;
    try {
      const { count: respCount, error: responsesError } = await supabase
        .from('user_responses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (responsesError) {
        logAction('GET_RESPONSES_COUNT_FAILED', userId, { error: responsesError.message });
      } else {
        responsesCount = respCount || 0;
      }
    } catch (error) {
      logAction('GET_RESPONSES_COUNT_ERROR', userId, { error: String(error) });
      // Don't fail - this is secondary data
    }

    // Fetch user research count
    let researchCount = 0;
    try {
      const { count: resCount, error: researchError } = await supabase
        .from('user_researches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (researchError) {
        logAction('GET_RESEARCH_COUNT_FAILED', userId, { error: researchError.message });
      } else {
        researchCount = resCount || 0;
      }
    } catch (error) {
      logAction('GET_RESEARCH_COUNT_ERROR', userId, { error: String(error) });
      // Don't fail - this is secondary data
    }

    // Fetch user subscription plan
    let subscriptionPlan = 'free';
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (userError) {
        logAction('GET_SUBSCRIPTION_PLAN_FAILED', userId, { error: userError.message });
      } else if (userData?.subscription_plan) {
        subscriptionPlan = userData.subscription_plan;
      }
    } catch (error) {
      logAction('GET_SUBSCRIPTION_PLAN_ERROR', userId, { error: String(error) });
      // Don't fail - this is secondary data, default to free
    }

    logAction('STATS_RETRIEVED', userId, { credits, responsesCount, researchCount, subscriptionPlan });

    return NextResponse.json({
      credits,
      responsesCount,
      researchCount,
      subscriptionPlan,
      email: session.user.email,
    });
  } catch (error) {
    return handleError(error);
  }
}
