import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeWebsite, extractDomain } from '@/lib/scraper';
import { analyzeProspect } from '@/lib/gemini';
import { decrementCredits, getUserCredits } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, service } = await req.json();

    if (!url || !service) {
      return NextResponse.json(
        { error: 'URL and service are required' },
        { status: 400 }
      );
    }

    // Check credits
    const credits = await getUserCredits(parseInt(session.user.id));
    if (credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    // Scrape website
    const content = await scrapeWebsite(url);
    if (!content) {
      return NextResponse.json(
        { error: 'Could not scrape website. Please try another URL.' },
        { status: 400 }
      );
    }

    // Extract domain
    const domain = await extractDomain(url);
    if (!domain) {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Analyze with Gemini
    const analysis = await analyzeProspect(domain, content, service);

    // Decrement credits
    await decrementCredits(parseInt(session.user.id));

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'An error occurred during analysis' },
      { status: 500 }
    );
  }
}
