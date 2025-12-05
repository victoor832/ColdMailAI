import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * Get recent webhook logs for debugging
 */
export async function GET(req: NextRequest) {
  try {
    // Query the action_logs table for webhook-related entries
    const { data: logs, error } = await supabase
      .from('action_logs')
      .select('*')
      .or('action.ilike.%WEBHOOK%,action.ilike.%STRIPE%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by event type and action
    const grouped: Record<string, any[]> = {};
    logs?.forEach((log) => {
      const key = `${log.action}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(log);
    });

    return NextResponse.json({
      total: logs?.length || 0,
      logs: logs || [],
      grouped,
    });
  } catch (error) {
    console.error('Webhook logs error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
