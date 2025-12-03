import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleResponse } from '@/lib/gemini';
import { saveUserResponse, saveGlobalResponse } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { originalEmail, prospectResponse, angleUsed } = await req.json();

    if (!prospectResponse) {
      return NextResponse.json(
        { error: 'Prospect response is required' },
        { status: 400 }
      );
    }

    // Analyze response with Gemini
    const analysis = await handleResponse(
      originalEmail || '',
      prospectResponse,
      angleUsed || 'unknown'
    );

    // Save to user responses
    await saveUserResponse(
      parseInt(session.user.id),
      angleUsed || 'unknown',
      analysis.analysis?.objectionType || '',
      analysis.analysis?.sentiment || '',
      analysis.analysis?.urgency || ''
    );

    // Save to global responses (for benchmarks)
    await saveGlobalResponse(
      angleUsed || 'unknown',
      analysis.analysis?.objectionType || '',
      analysis.analysis?.sentiment || '',
      analysis.analysis?.urgency || ''
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Respond error:', error);
    return NextResponse.json(
      { error: 'An error occurred during analysis' },
      { status: 500 }
    );
  }
}
