import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { Metadata } from 'next';
import ClientLayout from './client-layout';

export const metadata: Metadata = {
  title: 'ColdMailAI - AI Cold Email Research',
  description: 'Don\'t write cold emails. Let AI research them.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'ColdMailAI - AI Cold Email Research',
    description: 'Don\'t write cold emails. Let AI research them.',
    url: 'https://mail.readytorelease.online',
    siteName: 'ColdMailAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ColdMailAI - AI Cold Email Research',
    description: 'Don\'t write cold emails. Let AI research them.',
    images: ['/twitter-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Umami Analytics */}
        <script
          defer
          src="https://umami-7d62.onrender.com/script.js"
          data-website-id="81e3f5ed-220b-467c-b4ac-e8d7557e0da8"
        ></script>
      </head>
      <body className="bg-white dark:bg-slate-950">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
