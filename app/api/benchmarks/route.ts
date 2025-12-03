import { NextRequest, NextResponse } from 'next/server';
import { getGlobalResponseStats } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const stats = await getGlobalResponseStats();

    if (!stats) {
      return NextResponse.json(
        { error: 'Not enough data for benchmarks yet' },
        { status: 404 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Benchmarks error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
