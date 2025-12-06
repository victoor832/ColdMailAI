'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, LoadingButton } from '@/components/ui/loading';

interface Angle {
  type: string;
  hook: string;
  evidence: string;
  reasoning: string;
  connection: string;
}

export default function ResearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [service, setService] = useState('');
  const [loading, setLoading] = useState(false);
  const [angles, setAngles] = useState<Angle[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<Angle | null>(null);
  const [emails, setEmails] = useState<any>(null);
  const [error, setError] = useState('');

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, service }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Analysis failed');
        return;
      }

      // Extract angles from nested data structure
      const angles = data.data?.angles || data.angles || [];
      setAngles(angles);
      setEmails(null);
      setSelectedAngle(null);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateEmails(angle: Angle) {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, angle }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Generation failed');
        return;
      }

      setEmails(data);
      setSelectedAngle(angle);
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
        <h1 className="text-3xl font-bold mb-2">Research Assistant</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Paste a prospect URL and we'll find 3 specific cold email angles
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAnalyze} className="card mb-8 max-w-2xl">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Prospect URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input"
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Service You're Selling</label>
            <textarea
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="input"
              placeholder="Describe what you're selling..."
              rows={3}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <LoadingButton>Analyzing Prospect...</LoadingButton> : 'Analyze Prospect'}
          </Button>
        </form>

        {angles.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Found Angles</h2>
            {angles.map((angle, idx) => (
              <div key={idx} className="card">
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{angle.type}</h3>
                  <p className="text-blue-600 text-lg mt-1">{angle.hook}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Evidence:</p>
                    <p className="text-slate-900 dark:text-white">{angle.evidence}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Why it matters:</p>
                    <p className="text-slate-900 dark:text-white">{angle.reasoning}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">How we help:</p>
                    <p className="text-slate-900 dark:text-white">{angle.connection}</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateEmails(angle)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <LoadingButton>Generating Emails...</LoadingButton> : 'Generate Emails for This Angle'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {emails && selectedAngle && (
          <div className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">Email Variants</h2>
            {emails.variants?.map((variant: any, idx: number) => (
              <div key={idx} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{variant.type}</h3>
                    <p className="text-blue-600">{variant.subject}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(variant.body)}
                  >
                    Copy Body
                  </Button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mb-4">
                  <p className="whitespace-pre-wrap text-sm">{variant.body}</p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{variant.reasoning}</p>
              </div>
            ))}

            <h2 className="text-2xl font-bold mt-8">Follow-ups</h2>
            {emails.followUps?.map((followUp: any, idx: number) => (
              <div key={idx} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">Day {followUp.day}</h3>
                    <p className="text-blue-600">{followUp.subject}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(followUp.body)}
                  >
                    Copy Body
                  </Button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{followUp.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
