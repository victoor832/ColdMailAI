import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import type { Metadata } from 'next';
import ClientLayout from './client-layout';

export const metadata: Metadata = {
  title: 'ColdMailAI - AI Cold Email Research',
  description: 'Don\'t write cold emails. Let AI research them.',
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
