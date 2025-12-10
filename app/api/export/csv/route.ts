import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { AppError, handleError, logAction } from '@/lib/error-handler';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Export research data to CSV
 * Available for Pro ($19) and Unlimited ($99) plans
 * POST /api/export/csv
 * Body: { researchIds?: string[] } - optional, exports all if not specified
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user subscription plan
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_plan, email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      logAction('CSV_EXPORT_USER_NOT_FOUND', parseInt(userId), { userId });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if plan has CSV export permission
    const allowedPlans = ['pro', 'unlimited'];
    const userPlan = userData.subscription_plan || 'free';

    if (!allowedPlans.includes(userPlan)) {
      logAction('CSV_EXPORT_PLAN_NOT_ALLOWED', parseInt(userId), { 
        plan: userPlan,
        message: 'CSV export requires Pro plan or higher'
      });
      return NextResponse.json(
        { error: 'CSV export is only available for Pro ($19) and Unlimited ($99) plans. Upgrade your account to export your research data.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { researchIds } = body;

    // Get research data
    let query = supabase
      .from('user_researches')
      .select('id, url, service, angles, generated_emails, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (researchIds && Array.isArray(researchIds) && researchIds.length > 0) {
      query = query.in('id', researchIds);
    }

    const { data: researches, error: researchError } = await query;

    if (researchError) {
      logAction('CSV_EXPORT_FETCH_ERROR', parseInt(userId), { error: researchError.message });
      return NextResponse.json(
        { error: 'Failed to fetch research data' },
        { status: 500 }
      );
    }

    if (!researches || researches.length === 0) {
      logAction('CSV_EXPORT_NO_DATA', parseInt(userId), { message: 'No research data to export' });
      return NextResponse.json(
        { error: 'No research data found to export' },
        { status: 404 }
      );
    }

    // Convert to CSV format
    const csvData = convertToCSV(researches);

    // Log action
    logAction('CSV_EXPORT_SUCCESS', parseInt(userId), {
      recordsExported: researches.length,
      plan: userPlan
    });

    // Return CSV file
    const fileName = `coldmailai-research-${new Date().toISOString().split('T')[0]}.csv`;
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('CSV Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Convert research data to CSV format
 */
function convertToCSV(researches: any[]): string {
  // CSV Headers
  const headers = [
    'URL',
    'Service/Product',
    'Research Angles',
    'Emails Generated',
    'Date Created'
  ];

  // CSV Rows
  const rows = researches.map(research => [
    `"${research.url || ''}"`,
    `"${research.service || ''}"`,
    `"${Array.isArray(research.angles) ? research.angles.join('; ') : research.angles || ''}"`,
    `"${Array.isArray(research.generated_emails) ? research.generated_emails.length : 0}"`,
    `"${new Date(research.created_at).toISOString()}"`,
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csvContent;
}
