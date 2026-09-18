import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DrainWatch — Report Canal & Storm-Drain Blockages',
  description:
    'Citizen-powered blockage reporting system. Report blocked drains, track resolution status, and hold municipal authorities accountable in real time.',
  keywords: ['drain blockage', 'canal report', 'civic tech', 'municipality', 'smart city'],
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
