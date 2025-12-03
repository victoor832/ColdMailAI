import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserCredits, db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const credits = await getUserCredits(userId);

    // Get responses count
    const responsesResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_responses WHERE user_id = ?',
      args: [userId],
    });

    const responsesCount = (responsesResult.rows[0] as any).count || 0;

    return NextResponse.json({
      credits,
      responsesCount,
      email: session.user.email,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
