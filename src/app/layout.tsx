import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Geist } from 'next/font/google';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Mortimer',
  description: 'KI-Agent zur Unterstützung bei Jobsuche und Bewerbung',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={cn('font-sans', geist.variable)}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className="border-b border-neutral-200">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4 text-sm font-medium">
            <span className="font-semibold tracking-tight">Mortimer</span>
            <a href="/dokumente" className="text-neutral-600 hover:text-neutral-900">
              Dokumente
            </a>
            <a href="/profile" className="text-neutral-600 hover:text-neutral-900">
              Profil
            </a>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
