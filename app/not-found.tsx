'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-slate-400 mb-8 text-lg">
          Oops! The page you're looking for doesn't exist. But don't worry, our email research does! 🚀
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold">
              Back to Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" className="px-8 py-3 border border-slate-600 hover:border-slate-500 font-semibold">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
