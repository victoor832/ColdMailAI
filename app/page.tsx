'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Mail, Twitter, Linkedin, Facebook } from 'lucide-react';

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white">
            <div className="w-8 h-8 rounded flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            ColdMailAI
          </Link>
          <Link href={session ? '/dashboard' : '/auth/signin'} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              Stop Writing Cold Emails. Paste a URL → AI Finds Angles → 3 Hyper-Personalized Emails Ready.
            </h1>
            <p className="text-lg text-slate-400 mb-8">
              Paste a URL. AI investigates. Get 3 Cold Emails in 60 seconds.
            </p>
            
            {/* Input Bar */}
            <div className="flex gap-2 mb-8 max-w-xl mx-auto">
              <input 
                type="text" 
                placeholder="https://stripe.com"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Link href={session ? '/research' : '/auth/signup'}>
                <Button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold whitespace-nowrap">
                  Try Research Assistant - Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Two Assistants Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {/* Research Assistant */}
            <div className="border-2 border-cyan-400/50 rounded-lg p-6 hover:border-cyan-400 transition">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-cyan-400 text-2xl">🔍</div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Research Assistant (Paid)</h3>
                  <p className="text-sm text-slate-400">Paste URL → AI extracts 3 angles → Get 3 ready-to-send emails + 2 follow-ups</p>
                </div>
              </div>
            </div>

            {/* Response Assistant */}
            <div className="border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition bg-slate-900/50">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-slate-400 text-2xl">💬</div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">Response Assistant (Free)</h3>
                  <p className="text-sm text-slate-400">Prospect replied? Paste response → AI analyzes sentiment + objections → Get 2 perfect replies</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-900">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works in 3 Simple Steps</h2>
          <p className="text-center text-slate-400 mb-16">Get started in minutes, not hours.</p>
          
          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-4">1</div>
              <h3 className="text-xl font-bold mb-3">Enter a URL</h3>
              <p className="text-slate-400">Paste company website</p>
            </div>
            
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-4">2</div>
              <h3 className="text-xl font-bold mb-3">Let AI Work</h3>
              <p className="text-slate-400">Finds 3 specific angles + evidence</p>
            </div>
            
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-4">3</div>
              <h3 className="text-xl font-bold mb-3">Copy & Send</h3>
              <p className="text-slate-400">3 emails + follow-ups ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="container">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
            <div className="text-3xl mb-4">🛡️</div>
            <h3 className="text-2xl font-bold">Used by Solo Founders and Sales Agencies Globally</h3>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-slate-900">
        <div className="container max-w-2xl mx-auto">
          <div className="border border-slate-700 rounded-lg p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Ship Cold Emails That Actually Get Replies?</h2>
            <p className="text-slate-300 mb-4">
              Your Competitors Are Wasting 2.5 Hours Per Prospect. You? 60 seconds.
            </p>
            <Link href={session ? '/research' : '/auth/signup'}>
              <Button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-lg font-semibold">
                Create Account - Get 3 Free Researches
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 bg-slate-950">
        <div className="container">
          <div className="grid grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4 text-white">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/pricing" className="hover:text-blue-400 transition">Pricing</Link></li>
                <li><Link href="/features" className="hover:text-blue-400 transition">Features</Link></li>
                <li><Link href="/blog" className="hover:text-blue-400 transition">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/about" className="hover:text-blue-400 transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-blue-400 transition">Contact</Link></li>
                <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">Twitter</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/privacy" className="hover:text-blue-400 transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-blue-400 transition">Terms of Use</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Connect</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">LinkedIn</a></li>
                <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">Facebook</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex justify-between items-center">
            <p className="text-xs text-slate-500">&copy; 2024 ColdMailAI. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-400 transition">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
