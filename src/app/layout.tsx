import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { AgentPanel } from '@/components/agent/agent-panel';
import { ProfileSwitcher } from '@/components/profile/profile-switcher';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { profileService } from '@/core/profile/profile-service';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Mortimer',
  description: 'KI-Agent zur Unterstützung bei Jobsuche und Bewerbung',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [profiles, activeProfileId] = await Promise.all([profileService.listProfiles(), getActiveProfileId()]);

  return (
    <html lang="de" className={cn('font-sans', geist.variable)}>
      <body className="h-screen overflow-hidden bg-white text-neutral-900 antialiased">
        <TooltipProvider>
          <div className="flex h-full flex-col">
            <header className="shrink-0 border-b border-neutral-200">
              <nav className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-4 text-sm font-medium">
                <span className="font-semibold tracking-tight">Mortimer</span>
                <Link href="/profile" className="text-neutral-600 hover:text-neutral-900">
                  Mein Profil
                </Link>
                <Link href="/search-queries" className="text-neutral-600 hover:text-neutral-900">
                  Suchaufträge
                </Link>
                <Link href="/jobs" className="text-neutral-600 hover:text-neutral-900">
                  Jobs
                </Link>
                <Link href="/applications" className="text-neutral-600 hover:text-neutral-900">
                  Bewerbungen
                </Link>
                <div className="ml-auto">
                  <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />
                </div>
              </nav>
            </header>
            <div className="flex min-h-0 flex-1">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
              </div>
              <AgentPanel key={activeProfileId} />
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
