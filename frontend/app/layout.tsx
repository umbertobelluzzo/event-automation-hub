import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { SessionProvider } from '@/components/auth/session-provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'UIS Event-Automation Hub',
    description: 'AI-powered event management platform for United Italian Societies',
    keywords: [
      'events',
      'italian community',
      'event management',
      'ai automation',
      'united italian societies',
    ],
  };
  
  export default async function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const session = await getServerSession(authOptions);
  
    return (
      <html lang="en">
        <body className={inter.className}>
          <SessionProvider session={session}>
            {children}
            <Toaster />
          </SessionProvider>
        </body>
      </html>
    );
  }

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </html>
    );
  }