'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';

export default function PricingPage() {
  const { data: session } = useSession();

  const plans = [
    {
      name: 'Starter',
      price: '$9',
      credits: 10,
      features: ['10 Researches', 'Email support', 'Basic analytics'],
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$19',
      credits: 25,
      features: ['25 Researches', 'Priority support', 'Advanced analytics', 'API access'],
      highlighted: true,
    },
    {
      name: 'Unlimited',
      price: '$29',
      period: '/month',
      credits: 999999,
      features: ['Unlimited Researches', '24/7 support', 'Advanced analytics', 'API access', 'Custom templates'],
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="container py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            ColdMailAI
          </Link>
          {session ? (
            <Link href="/dashboard">
              <Button variant="secondary">Dashboard</Button>
            </Link>
          ) : (
            <Link href="/auth/signin">
              <Button variant="secondary">Sign In</Button>
            </Link>
          )}
        </div>
      </nav>

      {/* Pricing */}
      <div className="container py-20">
        <h1 className="text-4xl font-bold text-center mb-4">Simple, Transparent Pricing</h1>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12">
          Start with 3 free credits. No credit card required.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`card ${plan.highlighted ? 'ring-2 ring-blue-500 relative' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-slate-600 dark:text-slate-400">{plan.period}</span>}
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {plan.credits === 999999 ? 'Unlimited' : plan.credits} credits
              </p>

              <Button className="w-full mb-6">
                Get Started
              </Button>

              <div className="space-y-3">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Response Assistant</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Always free and unlimited. Analyze prospect responses at no cost and help build community insights.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <section className="bg-slate-50 dark:bg-slate-900 py-20">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-2">Do you offer refunds?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Yes, we offer a 30-day money-back guarantee. No questions asked.
              </p>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                For monthly subscriptions, yes. Cancel anytime from your dashboard.
              </p>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-2">What if I run out of credits?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                You can buy more at any time. Check your dashboard for available plans.
              </p>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-2">Is there an annual plan?</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Contact us at support@coldmailai.com for annual pricing and enterprise options.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
