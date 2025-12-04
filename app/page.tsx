'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Mail, Twitter, Linkedin, Facebook, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const { data: session } = useSession();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [selectedAngle, setSelectedAngle] = useState<number | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedFollowUp, setCopiedFollowUp] = useState(false);

  // Auto-play animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      const typeInterval = setInterval(() => {
        setInputValue((prev) => {
          const targetUrl = 'https://gymshark.com';
          if (prev.length < targetUrl.length) {
            return targetUrl.substring(0, prev.length + 1);
          }
          clearInterval(typeInterval);
          // Cuando se completa la URL, mostrar "Analyzing..." durante 2s
          setTimeout(() => {
            setIsAnalyzing(true);
            setTimeout(() => {
              setIsAnalyzing(false);
              setTimeout(() => setDemoStep(1), 500);
            }, 2000);
          }, 500);
          return prev;
        });
      }, 80);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const angles = [
    {
      title: 'Product Launch',
      subtitle: 'Boost Winter Shop & launches',
      score: '9/10'
    },
    {
      title: 'Market Problem',
      subtitle: 'Optimize shopping for specific training',
      score: '8/10'
    },
    {
      title: 'Specific Metric',
      subtitle: 'Maximize conversion from existing offers',
      score: '9/10'
    }
  ];

  const handleSelectAngle = (index: number) => {
    setSelectedAngle(index);
    setTimeout(() => setDemoStep(2), 300);
  };

  const handleStartEmail = () => {
    setDemoStep(3);
  };

  const copyToClipboard = (text: string, type: 'email' | 'followup') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedFollowUp(true);
        setTimeout(() => setCopiedFollowUp(false), 2000);
      }
    });
  };

  const emailsData: Record<number, {subject: string; body: string; followUpTitle: string; followUp: string}> = {
    0: {
      subject: "Gymshark Winter Shop: More eyes?",
      body: "Boost new Winter Shop launches. Your new Winter Shop collection – it's solid. But I'm wondering if enough of the right people are seeing it? New collections need visibility fast, or momentum can stall. We help brands like you get new drops in front of engaged buyers. The right targeting at launch = higher velocity. Could we show you what's possible in just 10 minutes?",
      followUpTitle: "Day 3 - Winter Shop Launch",
      followUp: "Just checking in – did you see my note about the Winter Shop?\nWe've been helping brands boost new launches, and the results speak for themselves.\nNo pressure at all.\nJust wanted to follow up."
    },
    1: {
      subject: "Gymshark: 'How do you train?' idea",
      body: "Optimize shopping for specific training. I saw your \"How do you train?\" page. You already ask about Lifting, Running, Pilates. Imagine if a lifter landed on a page curated just for them. Their shopping journey would be much clearer. They would find gear for their workout faster. We build systems that connect customer intent to product discovery. This directly improves conversions and makes their experience smoother.",
      followUpTitle: "Day 3 - Gymshark: \"How do you train?\" idea",
      followUp: "Following up on my note about your \"How do you train?\" section.\nThe core idea was helping customers find gear for Lifting, Running, or Pilates much faster.\nBy showing them only what matters for *their* specific training.\nLet me know if this sparks any thoughts. No worries if busy."
    },
    2: {
      subject: "Gymshark offers: more from current deals?",
      body: "Maximize conversion from existing offers. You have a 15% student discount. Plus free shipping over $75. And those free returns are generous. But are they converting as much as possible? Many businesses leave money on the table here. We find these missed opportunities. Then we help you capture that extra revenue. Could we show you a 10-minute example? No pressure, just a quick look.",
      followUpTitle: "Day 3 - Gymshark student discount thought",
      followUp: "Hey.\nJust a quick thought on your 15% student discount.\nWe often see small tweaks that make these offers work harder.\nNo pressure at all.\nJust checking if you saw my last email."
    }
  };

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
            {session ? 'Go to Dashboard' : 'Log In'}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              <span className="block mb-4">Paste URL → 3 Email Angles in 60s</span>
              <span className="block text-2xl text-slate-400 font-normal">Research → Angles → Emails. Done in 60 seconds</span>
            </h1>

            {/* Interactive Demo Flow */}
            <div className="mb-12 max-w-2xl mx-auto">
              {/* Step 1: URL Input */}
              {demoStep >= 0 && (
                <div className="flex gap-2 mb-6 animate-in fade-in">
                  <input
                    type="text"
                    value={inputValue}
                    placeholder="https://gymshark.com"
                    readOnly
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500"
                  />
                  <button
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 font-semibold whitespace-nowrap rounded-lg transition-all flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Analyzing...
                      </>
                    ) : (
                      'Paste URL'
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: Select Angle */}
              {demoStep >= 1 && (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-sm font-semibold text-slate-300 mb-3">📊 Step 2: Select Angle</p>
                  <div className="grid gap-3">
                    {angles.map((angle, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAngle(idx)}
                        className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                          selectedAngle === idx
                            ? 'border-blue-500 bg-blue-900/30'
                            : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-left">
                            <p className="font-semibold text-white">{angle.title}</p>
                            <p className="text-xs text-slate-400">{angle.subtitle}</p>
                          </div>
                          <span className="text-lg font-bold text-blue-400">{angle.score}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Email Preview */}
              {demoStep >= 2 && selectedAngle !== null && (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-sm font-semibold text-slate-300 mb-3">📧 Step 3: Email Ready to Copy</p>
                  <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg p-6 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Subject:</p>
                      <p className="font-semibold text-white text-sm">{selectedAngle !== null && emailsData[selectedAngle] ? emailsData[selectedAngle].subject : 'Subject'}</p>
                    </div>

                    <div className="border-t border-slate-700/50 pt-4">
                      <p className="text-xs text-slate-400 mb-2">Email Body:</p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {selectedAngle !== null && emailsData[selectedAngle] ? emailsData[selectedAngle].body : 'Loading...'}
                      </p>
                    </div>

                    <button 
                      onClick={() => {
                        const emailData = selectedAngle !== null && emailsData[selectedAngle] ? emailsData[selectedAngle] : null;
                        if (emailData) {
                          const fullEmail = `Subject: ${emailData.subject}\n\n${emailData.body}`;
                          copyToClipboard(fullEmail, 'email');
                        }
                      }}
                      className={`w-full px-4 py-2 rounded text-sm font-semibold transition ${copiedEmail ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {copiedEmail ? '✅ Copied!' : '📋 Copy Email'}
                    </button>

                    {/* Follow-up */}
                    <div className="border-t border-slate-700/50 pt-4">
                      <p className="text-xs text-slate-400 mb-2">{selectedAngle !== null && emailsData[selectedAngle] ? emailsData[selectedAngle].followUpTitle : 'Follow-up'}:</p>
                      <p className="text-sm text-slate-300 leading-relaxed mb-3 whitespace-pre-line">
                        {selectedAngle !== null && emailsData[selectedAngle] ? emailsData[selectedAngle].followUp : 'Loading...'}
                      </p>
                      <button 
                        onClick={() => {
                          const emailData = selectedAngle !== null && emailsData[selectedAngle] ? emailsData[selectedAngle] : null;
                          if (emailData) {
                            copyToClipboard(emailData.followUp, 'followup');
                          }
                        }}
                        className={`w-full px-4 py-2 rounded text-sm font-semibold transition ${copiedFollowUp ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                      >
                        {copiedFollowUp ? '✅ Copied!' : '📋 Copy Follow-up'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: CTA */}
              {demoStep >= 2 && selectedAngle !== null && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Link href={session ? '/dashboard' : '/auth/signup'}>
                    <button className="w-full px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold rounded-lg transition-all transform hover:scale-105">
                      🚀 Try This For Free
                    </button>
                  </Link>
                  <p className="text-center text-xs text-slate-500 mt-2">Get 3 free research analyses included</p>
                </div>
              )}
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
            <p className="text-slate-300 mb-8">
              Your Competitors Are Wasting 2.5 Hours Per Prospect. You? 60 seconds.
            </p>
            <div className="flex justify-center">
              <Link href={session ? '/research' : '/auth/signup'}>
                <Button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-lg font-semibold">
                  Create Account - Get 3 Free Researches
                </Button>
              </Link>
            </div>
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
                <li><Link href="/research" className="hover:text-blue-400 transition">Research Assistant</Link></li>
                <li><Link href="/response" className="hover:text-blue-400 transition">Response Assistant</Link></li>
                <li><Link href="/pricing" className="hover:text-blue-400 transition">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="mailto:victorca381@gmail.com" className="hover:text-blue-400 transition">Support</a></li>
                <li><a href="https://github.com/victoor832" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">GitHub</a></li>
                <li><a href="https://x.com/shipwithvictor" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">Twitter</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => setShowPrivacy(true)} className="hover:text-blue-400 transition">Privacy Policy</button></li>
                <li><button onClick={() => setShowTerms(true)} className="hover:text-blue-400 transition">Terms of Service</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Connect</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="https://www.producthunt.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition">Product Hunt</a></li>
              </ul>
            </div>
          </div>
            <div className="border-t border-slate-800 pt-8 flex justify-center">
              <p className="text-xs text-slate-500">&copy; 2025 ColdMailAI. All rights reserved.</p>
            </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Privacy Policy</h2>
              <button onClick={() => setShowPrivacy(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-slate-300 space-y-4">
              <section>
                <h3 className="text-xl font-bold text-white mb-3">1. Introduction</h3>
                <p>ColdMailAI ("we", "our", or "us") operates the ColdMailAI website and service. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">2. Data Collection</h3>
                <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li><strong>Account Information:</strong> Email address, name, and authentication credentials</li>
                  <li><strong>Service Data:</strong> URLs you research, angles generated, and emails created</li>
                  <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, and time spent</li>
                  <li><strong>Cookies:</strong> We use cookies to track your session and preferences</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">3. How We Use Your Data</h3>
                <p>ColdMailAI uses the collected data for various purposes:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li>To provide and maintain our Service</li>
                  <li>To notify you about changes to our Service</li>
                  <li>To provide customer support</li>
                  <li>To gather analysis or valuable information so that we can improve our Service</li>
                  <li>To monitor the usage of our Service</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">4. Data Security</h3>
                <p>The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">5. Third-Party Services</h3>
                <p>Our Service may contain links to other sites that are not operated by us. This Privacy Policy does not apply to third-party websites, and we are not responsible for their privacy practices.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">6. Changes to This Privacy Policy</h3>
                <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "effective date" at the top of this Privacy Policy.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">7. Contact Us</h3>
                <p>If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:victorca381@gmail.com" className="text-blue-400 hover:text-blue-300">victorca381@gmail.com</a></p>
              </section>

              <p className="text-xs text-slate-500 mt-6">Last updated: December 3, 2025</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Terms of Service</h2>
              <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-slate-300 space-y-4">
              <section>
                <h3 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h3>
                <p>By accessing and using ColdMailAI, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">2. Use License</h3>
                <p>Permission is granted to temporarily download one copy of the materials (information or software) on ColdMailAI for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                <ul className="list-disc list-inside space-y-2 mt-2">
                  <li>Modifying or copying the materials</li>
                  <li>Using the materials for any commercial purpose or for any public display</li>
                  <li>Attempting to decompile or reverse engineer any software contained on ColdMailAI</li>
                  <li>Removing any copyright or other proprietary notations from the materials</li>
                  <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">3. Disclaimer</h3>
                <p>The materials on ColdMailAI are provided on an 'as is' basis. ColdMailAI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">4. Limitations</h3>
                <p>In no event shall ColdMailAI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ColdMailAI, even if we or an authorized representative has been notified orally or in writing of the possibility of such damage.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">5. Accuracy of Materials</h3>
                <p>The materials appearing on ColdMailAI could include technical, typographical, or photographic errors. ColdMailAI does not warrant that any of the materials on our website are accurate, complete, or current. ColdMailAI may make changes to the materials contained on its website at any time without notice.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">6. Links</h3>
                <p>ColdMailAI has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by ColdMailAI of the site. Use of any such linked website is at the user's own risk.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">7. Modifications</h3>
                <p>ColdMailAI may revise these terms of service for our website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">8. Governing Law</h3>
                <p>These terms and conditions are governed by and construed in accordance with the laws of the United States and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-3">9. Contact Information</h3>
                <p>If you have any questions about these Terms of Service, please contact us at: <a href="mailto:victorca381@gmail.com" className="text-blue-400 hover:text-blue-300">victorca381@gmail.com</a></p>
              </section>

              <p className="text-xs text-slate-500 mt-6">Last updated: December 3, 2025</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
