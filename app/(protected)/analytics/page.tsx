'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/ui/loading';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCreditsUsed: 0,
    totalResearches: 0,
    totalResponses: 0,
    creditsRemaining: 0,
    avgCreditsPerResearch: 0,
    mostRecentResearch: null,
    researchTrend: [] as { date: string; count: number }[],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status]);

  async function fetchAnalytics() {
    try {
      // Fetch user stats
      const statsRes = await fetch('/api/user/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('Stats data:', statsData);
        setStats((prev) => ({
          ...prev,
          totalResearches: statsData.researchCount || 0,
          totalResponses: statsData.responsesCount || 0,
          creditsRemaining: statsData.credits || 0,
        }));
      } else {
        console.error('Stats fetch failed:', statsRes.status);
      }

      // Fetch history for additional insights
      const historyRes = await fetch('/api/user/history');
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        console.log('History data:', historyData);
        const mostRecent = historyData.research?.[0];
        if (mostRecent) {
          setStats((prev) => ({
            ...prev,
            mostRecentResearch: mostRecent,
          }));
        }
      } else {
        console.error('History fetch failed:', historyRes.status);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return <LoadingPage />;
  }

  if (!session) {
    return null;
  }

  const userName = session.user?.name?.split('@')[0] || session.user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ColdMailAI
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
            <button
              onClick={() => router.push('/api/auth/signout')}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your usage and insights at a glance
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Researches */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Total Researches
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalResearches}
                </p>
              </div>
              <div className="text-3xl">🔍</div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
              Prospects analyzed
            </p>
          </div>

          {/* Total Responses */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Prospect Responses
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.totalResponses}
                </p>
              </div>
              <div className="text-3xl">💬</div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
              Analyzed replies
            </p>
          </div>

          {/* Credits Remaining */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Credits Remaining
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.creditsRemaining >= 1000
                    ? `${(stats.creditsRemaining / 1000).toFixed(1)}K`
                    : stats.creditsRemaining}
                </p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
              For future research
            </p>
          </div>

          {/* Avg Credits Per Research */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Per Research
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  1
                </p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
              Credit per analysis
            </p>
          </div>
        </div>

        {/* Most Recent Research */}
        {stats.mostRecentResearch && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 mb-12">
            <h2 className="text-xl font-bold mb-4">Most Recent Research</h2>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  <span className="font-semibold">{stats.mostRecentResearch.url}</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Analyzed{' '}
                  {formatDistanceToNow(new Date(stats.mostRecentResearch.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <Link href="/dashboard">
                <Button>View Details</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4 text-blue-900 dark:text-blue-100">
            💡 Quick Tips
          </h2>
          <ul className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
            <li>✓ Each prospect research uses 1 credit</li>
            <li>✓ Response analysis is always free</li>
            <li>✓ You can buy more credits anytime from the pricing page</li>
            <li>✓ Exported emails can be sent directly from your email client</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Link href="/research" className="block">
            <Button className="w-full">Start New Research</Button>
          </Link>
          <Link href="/pricing" className="block">
            <Button variant="secondary" className="w-full">
              Buy Credits
            </Button>
          </Link>
          <Link href="/dashboard" className="block">
            <Button variant="secondary" className="w-full">
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
