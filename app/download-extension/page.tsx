'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function DownloadExtensionPage() {
  const [copied, setCopied] = useState(false);
  const [copiedExtensionsUrl, setCopiedExtensionsUrl] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';
  
  // Reemplaza con tu Extension ID real una vez publicado en Chrome Web Store
  const extensionId = 'REPLACE_WITH_EXTENSION_ID';
  
  // Validate extension ID in production
  if (!isDev && extensionId === 'REPLACE_WITH_EXTENSION_ID') {
    console.error('Extension ID not configured for production');
  }
  
  const chromeWebStoreUrl = `https://chrome.google.com/webstore/detail/${extensionId}`;
  const chromeExtensionsUrl = 'chrome://extensions/';
  
  const handleInstallClick = () => {
    const newWindow = window.open(chromeWebStoreUrl, '_blank');
    if (newWindow) newWindow.opener = null;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(chromeWebStoreUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        alert('Failed to copy URL. Please copy manually: ' + chromeWebStoreUrl);
      });
  };

  const handleCopyExtensionsUrl = () => {
    navigator.clipboard.writeText(chromeExtensionsUrl)
      .then(() => {
        setCopiedExtensionsUrl(true);
        setTimeout(() => setCopiedExtensionsUrl(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Please copy manually: ' + chromeExtensionsUrl);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ColdMailAI
          </Link>
          <div className="flex gap-3">
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/research">
              <Button variant="secondary" size="sm">
                Research
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container py-16 space-y-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Icon */}
          <div className="text-6xl">🚀</div>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white">
            Research Companies <span className="text-blue-600">Anywhere</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Get the ColdMailAI Chrome extension and generate personalized emails directly from any website. No switching tabs. No copying and pasting.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center py-8">
            <button 
              onClick={handleInstallClick}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl text-lg"
            >
              📥 Install from Chrome Web Store
            </button>
            <Link href="/research">
              <Button variant="outline" size="lg">
                Try Web Version
              </Button>
            </Link>
          </div>

          {/* Development Notice */}
          {isDev && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded text-left max-w-2xl mx-auto">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>💡 Development Note:</strong> The extension ID above is a placeholder. Once you publish to Chrome Web Store, replace <code className="bg-amber-100 dark:bg-amber-800 px-2 py-1 rounded text-xs">REPLACE_WITH_EXTENSION_ID</code> with your actual Extension ID in this file.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">
            Why Use ColdMailAI Extension?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔍',
                title: 'Research Instantly',
                desc: 'Click the extension icon and instantly research any company from any website.'
              },
              {
                icon: '🤖',
                title: 'AI-Generated Emails',
                desc: 'Get multiple personalized email variations with different angles.'
              },
              {
                icon: '⚡',
                title: 'Follow-up Sequences',
                desc: 'Receive AI-generated follow-up emails for different time periods.'
              },
              {
                icon: '💰',
                title: 'Completely Free',
                desc: 'Research and generate unlimited emails. No credit card. No limits.'
              },
              {
                icon: '🔐',
                title: 'Privacy First',
                desc: 'We don\'t track you. Only the URL you research is sent to our servers.'
              },
              {
                icon: '📊',
                title: 'Sentiment Analysis',
                desc: 'Understand tone, objections, and urgency. Send with confidence.'
              }
            ].map((feature, idx) => (
              <div key={idx} className="space-y-3 p-6 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          Getting Started
        </h2>

        <div className="max-w-2xl mx-auto space-y-6">
          {[
            { num: 1, title: 'Install the Extension', desc: 'Click "Install from Chrome Web Store" and approve permissions.' },
            { num: 2, title: 'Visit Any Company', desc: 'Go to LinkedIn, their website, or any other page.' },
            { num: 3, title: 'Click the Icon', desc: 'Click the ColdMailAI icon in your browser toolbar.' },
            { num: 4, title: 'Get Personalized Emails', desc: 'Instantly receive email variations and follow-ups.' }
          ].map((step) => (
            <div key={step.num} className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-600 text-white font-bold">
                  {step.num}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Development Instructions */}
      {isDev && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-b border-blue-200 dark:border-blue-800 py-16">
          <div className="container">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
              Testing the Extension (Development)
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
              {/* Option 1: Load Unpacked */}
              <div className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Load Unpacked (Local Development)
                </h3>
                <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside">
                  <li>Copy the extensions URL below</li>
                  <li>Paste into your address bar and press Enter</li>
                  <li>Enable "Developer mode" (top right)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">public/chrome-extension</code></li>
                </ol>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                  <span className="flex-1">{chromeExtensionsUrl}</span>
                </div>
                <button
                  onClick={handleCopyExtensionsUrl}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
                >
                  {copiedExtensionsUrl ? '✓ Copied!' : 'Copy URL'}
                </button>
              </div>

              {/* Option 2: Web Store (Production) */}
              <div className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Chrome Web Store (Production)
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Once your extension is published:
                </p>
                <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside">
                  <li>Get your Extension ID from Web Store</li>
                  <li>Update <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded text-xs">REPLACE_WITH_EXTENSION_ID</code> in this file</li>
                  <li>The button above will link to your listing</li>
                </ol>
                <button
                  onClick={handleCopyUrl}
                  className="w-full mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy Current URL'}
                </button>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-300 dark:border-blue-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">📝 Quick Setup Guide</h4>
              <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                <li>Ensure dev server is running: <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs font-mono">pnpm dev</code></li>
                <li>Run build script: <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs font-mono">pnpm run build:extension:dev</code></li>
                <li>Click "Open chrome://extensions/" button above</li>
                <li>Load unpacked: select <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs font-mono">public/chrome-extension</code></li>
                <li>Test the extension on any website</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="container py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h2>

        <div className="max-w-2xl mx-auto space-y-4">
          {[
            {
              q: 'Is it really free?',
              a: 'Yes! ColdMailAI research and email generation is completely free. We offer premium features on our web app, but the extension is 100% free.'
            },
            {
              q: 'Is my data safe?',
              a: 'Yes. We use HTTPS encryption for all data transmission. We only send the URL you\'re researching to our servers. We don\'t track you or sell data.'
            },
            {
              q: 'Can I use it on any website?',
              a: 'Yes! The extension works on any website - LinkedIn profiles, company websites, Crunchbase, and more.'
            },
            {
              q: 'What if I need help?',
              a: 'We have documentation and video tutorials. You can reach out to support@mail.readytorelease.online for assistance.'
            }
          ].map((faq, idx) => (
            <details key={idx} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 open:bg-blue-50 dark:open:bg-blue-900/20 open:border-blue-300 dark:open:border-blue-700 cursor-pointer">
              <summary className="font-bold text-slate-900 dark:text-white">
                {faq.q}
              </summary>
              <p className="text-slate-600 dark:text-slate-400 mt-3 text-sm">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Supercharge Your Cold Email Game?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Get personalized emails in seconds. Research companies instantly. Send with confidence.
          </p>
          
          <button 
            onClick={handleInstallClick}
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors inline-block text-lg"
          >
            📥 Install Now
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="container text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            &copy; 2025 ColdMailAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
