import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint - Get webhook processing logs
 */
export async function GET(req: NextRequest) {
  try {
    const { data: logs, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({
        error: error.message,
        note: 'Make sure webhook_logs table exists. Run schema.sql if needed.',
      });
    }

    // Group by status
    const grouped: Record<string, any[]> = {};
    logs?.forEach((log) => {
      if (!grouped[log.status]) {
        grouped[log.status] = [];
      }
      grouped[log.status].push(log);
    });

    return NextResponse.json({
      total: logs?.length || 0,
      grouped,
      logs: logs || [],
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
