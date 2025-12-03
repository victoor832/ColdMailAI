'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ColdMailAI
          </Link>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Credits: <strong>3</strong>
            </span>
            <Link href="/research">
              <Button>Research</Button>
            </Link>
            <Link href="/respond">
              <Button variant="secondary">Respond</Button>
            </Link>
            <Button
              variant="destructive"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container py-12">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session.user?.email}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Manage your cold email research and responses
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Research Assistant</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Find specific angles for your cold emails. Uses 1 credit per research.
            </p>
            <Link href="/research">
              <Button className="w-full">Start Research</Button>
            </Link>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Response Assistant</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Analyze prospect responses and get smart replies. Always free!
            </p>
            <Link href="/respond">
              <Button className="w-full">Handle Response</Button>
            </Link>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Your Stats</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card text-center">
              <div className="text-4xl font-bold text-blue-600">3</div>
              <p className="text-slate-600 dark:text-slate-400">Credits Available</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-blue-600">0</div>
              <p className="text-slate-600 dark:text-slate-400">Researches Done</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-blue-600">0</div>
              <p className="text-slate-600 dark:text-slate-400">Responses Handled</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Link href="/pricing">
            <Button>Buy More Credits</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
