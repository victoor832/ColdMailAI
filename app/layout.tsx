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
      <body className="bg-white dark:bg-slate-950">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
