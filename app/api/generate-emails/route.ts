import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateEmails } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // next-auth's Session.user may not include an `id` by default,
    // so verify that a user object exists (or check for email if you need an identifier).
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, angle } = await req.json();

    if (!url || !angle) {
      return NextResponse.json(
        { error: 'URL and angle are required' },
        { status: 400 }
      );
    }

    // Generate emails with Gemini
    const emails = await generateEmails(
      url,
      angle.hook,
      angle.evidence,
      ''
    );

    return NextResponse.json(emails);
  } catch (error) {
    console.error('Generate emails error:', error);
    return NextResponse.json(
      { error: 'An error occurred during generation' },
      { status: 500 }
    );
  }
}
