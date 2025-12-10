'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LoadingButton, LoadingPage } from '@/components/ui/loading';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { exportToCSV } from '@/lib/utils';
import { toast } from 'sonner';

// Note: exportToCSV() throws Error('No data to export') on empty data
// All calls must be wrapped in try-catch for proper error handling

// Validate email format using robust regex pattern
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 simplified pattern for most common cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Format credits for display (e.g., 10000049 -> 10M, null -> Unlimited)
function formatCredits(credits: number | null): string {
  if (credits === null) {
    return 'Unlimited';
  }
  if (credits >= 1000000) {
    return (credits / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (credits >= 1000) {
    return (credits / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return credits.toString();
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [history, setHistory] = useState<{ research: any[]; responses: any[] }>({
    research: [],
    responses: [],
  });
  const [credits, setCredits] = useState<number | null>(0);
  const [selectedResearch, setSelectedResearch] = useState<any>(null);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [emails, setEmails] = useState<any>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchHistory();
    }
  }, [status]);

  async function fetchHistory() {
    try {
      const res = await fetch('/api/user/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
      
      // Fetch user stats including credits
      const statsRes = await fetch('/api/user/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        // Set credits directly - null for unlimited, number for limited
        setCredits(statsData.credits !== undefined ? statsData.credits : 0);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateEmails(angle: any) {
    setGeneratingEmail(true);
    try {
      const response = await fetch('/api/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedResearch.url, angle }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmails(data);
        // Refresh history to get updated emails
        await fetchHistory();
      }
    } catch (err) {
      console.error('Failed to generate emails:', err);
    } finally {
      setGeneratingEmail(false);
    }
  }

  async function handleSendEmail(emailId: string, subject: string, body: string) {
    // Validate email format
    if (!recipientEmail) {
      toast.error('Email address required', {
        description: 'Please enter a recipient email address',
      });
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      toast.error('Invalid email format', {
        description: `"${recipientEmail}" is not a valid email address. Please check and try again.`,
      });
      return;
    }

    setSendingEmailId(emailId);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          body,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to send email';
        toast.error('Email not sent', {
          description: errorMessage,
        });
        return;
      }

      toast.success('Email sent successfully', {
        description: `Your email was sent to ${recipientEmail}`,
      });
      // Keep recipient email persisted for user convenience
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error('Failed to send email', {
        description: errorMsg,
      });
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleDelete(type: 'research' | 'response', id: number) {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`/api/user/history?type=${type}&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Close modal and refresh history
        setSelectedResearch(null);
        setSelectedResponse(null);
        setEmails(null);
        await fetchHistory();
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
      alert('Failed to delete record');
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return <LoadingPage />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40">
        <div className="container px-6 py-4 flex justify-between items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-blue-600 flex-shrink-0">
            ColdMailAI
          </Link>

          {/* Centered Credits Display - Hidden on small screens */}
          <div className="hidden sm:block absolute left-1/2 transform -translate-x-1/2">
            <Link href="/pricing" className="group">
              <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">Credits:</span>
                <span className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400" title={credits === null ? 'Unlimited' : credits.toString()}>
                  {formatCredits(credits)}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors hidden sm:inline flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex gap-2 items-center flex-shrink-0">
            <Link href="/research">
              <Button variant="secondary" size="sm">Research</Button>
            </Link>
            <Link href="/respond">
              <Button variant="secondary" size="sm">Respond</Button>
            </Link>
            <Link href="/templates">
              <Button variant="secondary" size="sm">Templates</Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary" size="sm">Analytics</Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button and Credits - Visible on mobile and tablet */}
          <div className="lg:hidden flex items-center gap-3 flex-shrink-0">
            {/* Mobile Credits */}
            <Link href="/pricing" className="group sm:hidden">
              <div className="flex items-center gap-1 px-2 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800 rounded hover:border-blue-400 transition-all">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCredits(credits)}
                </span>
              </div>
            </Link>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="container px-6 py-4 space-y-2 flex flex-col">
              <Link href="/research" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">Research</Button>
              </Link>
              <Link href="/respond" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">Respond</Button>
              </Link>
              <Link href="/templates" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">Templates</Button>
              </Link>
              <Link href="/analytics" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">Analytics</Button>
              </Link>
              <Button
                variant="destructive"
                className="w-full justify-center"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {session.user?.name?.split('@')[0] || session.user?.email?.split('@')[0]}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Start researching prospects or handle responses
        </p>

        {/* Enhanced Low Credits Warning Banner */}
        {credits !== null && credits <= 1 && credits > 0 && (
          <div className="mb-8 relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-red-100 to-pink-100 dark:from-orange-900/30 dark:via-red-900/30 dark:to-pink-900/30 animate-pulse"></div>

            <div className="relative bg-gradient-to-r from-orange-50/95 to-red-50/95 dark:from-orange-900/40 dark:to-red-900/40 backdrop-blur-sm border-2 border-orange-300 dark:border-orange-700 rounded-xl p-8 shadow-lg">
              <div className="flex items-start gap-6">
                {/* Icon Section */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <span className="text-3xl">⚡</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-black text-2xl mb-2 flex items-center gap-3">
                        <span className="inline-block text-2xl">🚨</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400">
                          Your Outreach is About to Stop!
                        </span>
                      </h3>
                      <p className="text-lg text-orange-900 dark:text-orange-100 font-semibold mb-3">
                        Only <span className="text-2xl font-black text-red-600 dark:text-red-400">{credits}</span> credits left - that's just {credits} more prospect{credits !== 1 ? 's' : ''}!
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-5">
                    <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎯</span>
                        <h4 className="font-bold text-slate-900 dark:text-white">What You're Missing</h4>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Every hour without credits = lost opportunities. Your competitors are already reaching out.
                      </p>
                    </div>

                    <div className="bg-white/60 dark:bg-slate-900/60 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">💰</span>
                        <h4 className="font-bold text-slate-900 dark:text-white">Best Value</h4>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        More credits = lower cost per research. Bulk packages save you up to 40%!
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link href="/pricing">
                      <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold px-8 py-3 text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                        🔥 Get More Credits Now
                      </Button>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-orange-800 dark:text-orange-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">Limited time: 20% off all packages!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Link href="/research" className="block group">
            <div className="card hover:border-blue-500 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-600 transition-colors">🔍 Research Assistant</h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    AI finds 3 specific angles + generates personalized emails
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                  1 Credit
                </div>
              </div>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                Start Research
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link href="/respond" className="block group">
            <div className="card hover:border-green-500 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 group-hover:text-green-600 transition-colors">💬 Response Assistant</h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    AI analyzes sentiment + crafts perfect replies
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                  Free
                </div>
              </div>
              <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                Handle Response
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Research */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recent Research</h2>
              {history.research.length > 0 && (
                <button
                  onClick={() => {
                    try {
                      exportToCSV(history.research, `research-export-${new Date().toISOString().split('T')[0]}.csv`);
                      alert('✅ Research data exported successfully!');
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      console.error('Export failed:', error);
                      alert(`❌ Export failed: ${errorMessage}`);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                  title="Download research data as CSV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {history.research.length === 0 ? (
                <p className="text-slate-600 dark:text-slate-400">No research history yet.</p>
              ) : (
                history.research.map((item) => (
                  <div
                    key={item.id}
                    className="card p-4 cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => setSelectedResearch(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold truncate pr-4">{item.url}</h3>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 truncate">
                      Selling: {item.service}
                    </p>
                    <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-1 rounded inline-block">
                      {item.angles?.length || 0} Angles Found
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Responses */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recent Responses</h2>
              {history.responses.length > 0 && (
                <button
                  onClick={() => {
                    try {
                      exportToCSV(history.responses, `responses-export-${new Date().toISOString().split('T')[0]}.csv`);
                      alert('✅ Response data exported successfully!');
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      console.error('Export failed:', error);
                      alert(`❌ Export failed: ${errorMessage}`);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg transition-colors"
                  title="Download response analysis data as CSV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {history.responses.length === 0 ? (
                <p className="text-slate-600 dark:text-slate-400">No response history yet.</p>
              ) : (
                history.responses.map((item) => (
                  <div
                    key={item.id}
                    className="card p-4 cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => setSelectedResponse(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold capitalize">{item.sentiment} Response</h3>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                      "{item.prospect_response}"
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {item.objection_type}
                      </span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {item.urgency}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Research Modal */}
      <Modal
        isOpen={!!selectedResearch}
        onClose={() => {
          setSelectedResearch(null);
          setEmails(null);
        }}
        title="Research Details"
        size="full"
      >
        {selectedResearch && (
          <>
            {/* Delete Button */}
            <div className="absolute top-4 right-16 z-20">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete('research', selectedResearch.id)}
              >
                Delete
              </Button>
            </div>
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header */}
              <div className="flex flex-wrap gap-6 p-1 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Target URL</h3>
                  <p className="font-semibold truncate max-w-md">{selectedResearch.url}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Service</h3>
                  <p className="font-semibold truncate max-w-md">{selectedResearch.service}</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date</h3>
                  <p className="font-semibold">{formatDistanceToNow(new Date(selectedResearch.created_at), { addSuffix: true })}</p>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden pt-4">
                {/* Left Column: Angles */}
                <div className="lg:col-span-4 overflow-y-auto pr-2 space-y-4 h-full">
                  <h3 className="text-lg font-bold sticky top-0 bg-white dark:bg-slate-900 py-2 z-10">Generated Angles</h3>
                  {selectedResearch.angles?.map((angle: any, i: number) => {
                    let parsedAngle = angle;
                    if (typeof angle === 'string') {
                      try {
                        parsedAngle = JSON.parse(angle);
                      } catch (e) {
                        // Keep as string if parsing fails
                      }
                    }

                    if (typeof parsedAngle === 'object' && parsedAngle !== null) {
                      return (
                        <div key={i} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-start mb-3 gap-4">
                            <div>
                              <h4 className="font-bold text-blue-600 dark:text-blue-400 text-base mb-1">{parsedAngle.type?.replace(/_/g, ' ')}</h4>
                              <p className="font-medium text-sm">{parsedAngle.hook}</p>
                            </div>
{/*                             <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full whitespace-nowrap h-fit">
                              {parsedAngle.specificityScore}/10
                            </span> */}
                          </div>

                                                    <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 mb-4">
                            <p><span className="font-semibold">Why:</span> {parsedAngle.reasoning}</p>
                            <p><span className="font-semibold">Connection:</span> {parsedAngle.connection}</p>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleGenerateEmails(parsedAngle)}
                            disabled={generatingEmail}
                            className="w-full"
                            variant={emails ? "outline" : "primary"}
                          >
                            {generatingEmail ? <LoadingButton>Generating...</LoadingButton> : 'Generate Emails'}
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <p className="text-sm">{String(angle)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Emails */}
                <div className="lg:col-span-8 overflow-y-auto h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border-l border-slate-200 dark:border-slate-800 pl-6">
                  {!emails && !selectedResearch.generated_emails ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <p>Select an angle to generate emails</p>
                    </div>
                  ) : (
                    <div className="space-y-8 pb-8 animate-in fade-in duration-300">
                      {/* Recipient Email Input - Enhanced */}
                      <div className="card bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-300 dark:border-blue-700 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          <label className="block text-sm font-bold text-blue-700 dark:text-blue-300">Send Email Directly (NEW!)</label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            placeholder="recipient@example.com"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-500 font-medium focus:border-blue-500 focus:outline-none"
                          />
                          <Button 
                            variant="secondary" 
                            disabled={!recipientEmail}
                            className={recipientEmail ? 'bg-blue-100 hover:bg-blue-200' : ''}
                          >
                            ✓ Ready
                          </Button>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Emails are sent via Resend within 1–2 seconds</p>
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold mb-6 sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 py-4 z-10 backdrop-blur-sm">Email Variants</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                          {(emails?.variants || selectedResearch.generated_emails?.variants)?.map((variant: any, idx: number) => (
                            <div key={idx} className="card bg-white dark:bg-slate-950 shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">{variant.type}</h4>
                                  <p className="text-blue-600 font-medium text-sm">{variant.subject}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigator.clipboard.writeText(variant.body)}
                                    className="h-8"
                                  >
                                    Copy
                                  </Button>
                                  {(() => {
                                    const variantId = `variant-${idx}-${variant.subject}`;
                                    return (
                                      <Button
                                        onClick={() => handleSendEmail(variantId, variant.subject, variant.body)}
                                        disabled={!recipientEmail || sendingEmailId !== null}
                                        size="sm"
                                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        {sendingEmailId === variantId ? 'Sending...' : 'Send Email'}
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border border-slate-100 dark:border-slate-800">
                                <p className="whitespace-pre-wrap text-sm font-mono text-slate-600 dark:text-slate-300">{variant.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold mb-6">Follow-up Sequence</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                          {(emails?.followUps || selectedResearch.generated_emails?.followUps)?.map((followUp: any, idx: number) => (
                            <div key={idx} className="card bg-white dark:bg-slate-950 shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Day {followUp.day}</h4>
                                  <p className="text-blue-600 font-medium text-sm">{followUp.subject}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigator.clipboard.writeText(followUp.body)}
                                    className="h-8"
                                  >
                                    Copy
                                  </Button>
                                  {(() => {
                                    const followupId = `followup-${idx}-${followUp.subject}`;
                                    return (
                                      <Button
                                        onClick={() => handleSendEmail(followupId, followUp.subject, followUp.body)}
                                        disabled={!recipientEmail || sendingEmailId !== null}
                                        size="sm"
                                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        {sendingEmailId === followupId ? 'Sending...' : 'Send Email'}
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border border-slate-100 dark:border-slate-800">
                                <p className="whitespace-pre-wrap text-sm font-mono text-slate-600 dark:text-slate-300">{followUp.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Response Modal */}
      <Modal
        isOpen={!!selectedResponse}
        onClose={() => setSelectedResponse(null)}
        title="Response Analysis"
        size="xl"
      >
        {selectedResponse && (
          <>
            {/* Delete Button */}
            <div className="absolute top-4 right-16 z-20">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete('response', selectedResponse.id)}
              >
                Delete
              </Button>
            </div>

            <div className="space-y-6">
              {/* Analysis Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Sentiment</h3>
                  <p className="text-2xl font-bold capitalize text-green-900 dark:text-green-100">{selectedResponse.sentiment}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <h3 className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Urgency</h3>
                  <p className="text-2xl font-bold capitalize text-orange-900 dark:text-orange-100">{selectedResponse.urgency}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Objection</h3>
                  <p className="text-2xl font-bold capitalize text-blue-900 dark:text-blue-100">{selectedResponse.objection_type?.replace(/_/g, ' ')}</p>
                </div>
              </div>

              {/* Original Response */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Prospect's Response
                </h3>
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-lg border-l-4 border-blue-500">
                  <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">"{selectedResponse.prospect_response}"</p>
                </div>
              </div>

              {/* Suggested Replies */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Suggested Replies</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedResponse.generated_replies?.map((reply: any, i: number) => {
                    // Parse reply if it's a JSON string
                    let parsedReply = reply;
                    if (typeof reply === 'string') {
                      try {
                        parsedReply = JSON.parse(reply);
                      } catch (e) {
                        // Keep as string if parsing fails
                      }
                    }

                    // Check if it's an object with subject and body
                    const hasStructure = typeof parsedReply === 'object' && parsedReply !== null;
                    const replyBody = hasStructure ? (parsedReply.body || parsedReply.content || parsedReply.text) : parsedReply;
                    const replySubject = hasStructure ? parsedReply.subject : null;
                    const replyType = hasStructure ? parsedReply.type : null;

                    return (
                      <div key={i} className="card bg-white dark:bg-slate-950 shadow-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            {replyType && (
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                {replyType}
                              </h4>
                            )}
                            {replySubject && (
                              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                                {replySubject}
                              </p>
                            )}
                            {!replyType && !replySubject && (
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Reply Option {i + 1}
                              </h4>
                            )}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(typeof replyBody === 'string' ? replyBody : JSON.stringify(replyBody))}
                            className="h-8"
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded border border-slate-100 dark:border-slate-800">
                          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                            {typeof replyBody === 'string' ? replyBody : JSON.stringify(replyBody, null, 2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div >
  );
}
