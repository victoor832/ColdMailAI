'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading';

export default function RespondPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [originalEmail, setOriginalEmail] = useState('');
  const [prospectResponse, setProspectResponse] = useState('');
  const [angleUsed, setAngleUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState('');

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalEmail,
          prospectResponse,
          angleUsed: angleUsed || 'unknown',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Analysis failed');
        return;
      }

      // Extract analysis from nested data structure
      const analysisData = data.data || data;
      setAnalysis(analysisData);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ColdMailAI
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </nav>

      <div className="container py-12">
        <h1 className="text-3xl font-bold mb-2">Response Assistant</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Paste a prospect's response and we'll generate the perfect reply (always free!)
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAnalyze} className="card mb-8 max-w-2xl">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Original Email (optional)</label>
            <textarea
              value={originalEmail}
              onChange={(e) => setOriginalEmail(e.target.value)}
              className="input"
              placeholder="Paste the email you sent..."
              rows={4}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Prospect's Response</label>
            <textarea
              value={prospectResponse}
              onChange={(e) => setProspectResponse(e.target.value)}
              className="input"
              placeholder="Paste their response..."
              rows={4}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Angle Used (optional)</label>
            <input
              type="text"
              value={angleUsed}
              onChange={(e) => setAngleUsed(e.target.value)}
              className="input"
              placeholder="e.g., recent_achievement"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingButton>Analyzing Response...</LoadingButton> : 'Generate Reply'}
          </Button>
        </form>

        {analysis && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Analysis</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="card">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sentiment</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.analysis?.sentiment}</p>
              </div>
              <div className="card">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Objection Type</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.analysis?.objectionType}</p>
              </div>
              <div className="card">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Urgency</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.analysis?.urgency}</p>
              </div>
              <div className="card">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Recommended Action</p>
                <p className="text-sm">{analysis.analysis?.recommendedAction}</p>
              </div>
            </div>

            {analysis.analysis?.buyingSignals?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold mb-3">✅ Buying Signals</h3>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.analysis.buyingSignals.map((signal: string, idx: number) => (
                    <li key={idx} className="text-green-600 dark:text-green-400">{signal}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.analysis?.redFlags?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold mb-3">⚠️ Red Flags</h3>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.analysis.redFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="text-red-600 dark:text-red-400">{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <h2 className="text-2xl font-bold mt-8">Suggested Replies</h2>
            {analysis.replies?.map((reply: any, idx: number) => (
              <div key={idx} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{reply.variant}</h3>
                    <p className="text-blue-600">{reply.subject}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(reply.body)}
                  >
                    Copy
                  </Button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{reply.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
