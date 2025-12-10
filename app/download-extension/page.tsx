'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function DownloadExtensionPage() {
  const [copied, setCopied] = useState(false);
  const [copiedExtensionsUrl, setCopiedExtensionsUrl] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';
  
  // Extension download details
  const GITHUB_OWNER = 'victoor832';
  const GITHUB_REPO = 'ColdMailAI';
  const GITHUB_BRANCH = 'main';
  
  const apiDownloadUrl = '/api/download-extension';
  const githubRepoUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const chromeExtensionsUrl = 'chrome://extensions/';
  
  const handleDownloadClick = () => {
    // Descarga solo la carpeta chrome-extension desde el API endpoint
    window.location.href = apiDownloadUrl;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(githubRepoUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        alert('Failed to copy URL. Please copy manually: ' + githubRepoUrl);
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
              onClick={handleDownloadClick}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl text-lg"
            >
              📥 Download from GitHub
            </button>
            <Link href="/research">
              <Button variant="outline" size="lg">
                Try Web Version
              </Button>
            </Link>
          </div>

          {/* GitHub Notice */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 rounded text-left max-w-2xl mx-auto">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>📦 Download & Install:</strong> Click "Download from GitHub" to get the latest extension code. Then follow the "Load Unpacked" instructions below to install it locally.
            </p>
          </div>
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
              Installation Instructions
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
              {/* Step 1: Download from GitHub */}
              <div className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Step 1: Download from GitHub
                </h3>
                <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside">
                  <li>Click "📥 Download from GitHub" button above</li>
                  <li>Extract the ZIP file (unzip ColdMailAI-main.zip)</li>
                  <li>Navigate to: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">ColdMailAI-main/public/chrome-extension</code></li>
                </ol>
                <a
                  href={`https://github.com/victoor832/ColdMailAI`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors text-center"
                >
                  🔗 Go to GitHub Repo
                </a>
              </div>

              {/* Step 2: Load Unpacked */}
              <div className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Step 2: Load Unpacked
                </h3>
                <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside">
                  <li>Open <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">chrome://extensions/</code></li>
                  <li>Enable "Developer mode" (toggle top right)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">chrome-extension</code> folder</li>
                </ol>
                <button
                  onClick={handleCopyExtensionsUrl}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors"
                >
                  {copiedExtensionsUrl ? '✓ Copied!' : 'Copy chrome://extensions/'}
                </button>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-300 dark:border-blue-700 max-w-3xl">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">🎯 Quick Steps</h4>
              <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                <li>Download ZIP from GitHub (button above)</li>
                <li>Extract: <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs font-mono">unzip ColdMailAI-main.zip</code></li>
                <li>Open: <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs font-mono">chrome://extensions/</code></li>
                <li>Load unpacked: <code className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded text-xs font-mono">ColdMailAI-main/public/chrome-extension</code></li>
                <li>Extension will appear in your toolbar! 🎉</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Production Notice */}
      {!isDev && (
        <div className="bg-green-50 dark:bg-green-900/20 border-t border-b border-green-200 dark:border-green-800 py-12">
          <div className="container text-center">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✅ Production Mode:</strong> Download the extension from GitHub to use it locally, or use the web version on our dashboard.
            </p>
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
            onClick={handleDownloadClick}
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors inline-block text-lg"
          >
            📥 Download from GitHub
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
