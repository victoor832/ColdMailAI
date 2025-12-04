'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for debugging
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-7xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
          500
        </div>
        <h1 className="text-4xl font-bold mb-4">Something Went Wrong</h1>
        <p className="text-slate-400 mb-2 text-lg">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <p className="text-slate-500 mb-8 text-sm font-mono">
          {error.digest && `Error ID: ${error.digest}`}
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg transition"
          >
            Try Again
          </button>
          <Link href="/">
            <Button variant="secondary" className="px-8 py-3 border border-slate-600 hover:border-slate-500 font-semibold">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
