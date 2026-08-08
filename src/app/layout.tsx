import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Fraunces, Geist } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { AgentPanel, PANEL_COLLAPSED_COOKIE } from '@/components/agent/agent-panel';
import { MainNav } from '@/components/nav/main-nav';
import { ProfileSwitcher } from '@/components/profile/profile-switcher';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getActiveProfileId } from '@/core/profile/active-profile';
import { profileService } from '@/core/profile/profile-service';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'Leopold',
  description: 'KI-Agent zur Unterstützung bei Jobsuche und Bewerbung',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [profiles, activeProfileId, cookieStore] = await Promise.all([
    profileService.listProfiles(),
    getActiveProfileId(),
    cookies(),
  ]);
  const panelCollapsed = cookieStore.get(PANEL_COLLAPSED_COOKIE)?.value === 'true';

  return (
    <html lang="de" className={cn('font-sans', geist.variable, fraunces.variable)}>
      <body className="h-screen overflow-hidden bg-background text-foreground antialiased">
        <TooltipProvider>
          <div className="flex h-full flex-col">
            <header className="shrink-0 bg-secondary shadow-sm">
              <nav className="relative mx-auto flex max-w-4xl items-center gap-2 px-4 py-4 font-medium sm:px-8 sm:py-6 md:gap-10">
                <Link href="/" className="md:mr-8">
                  <Image
                    src="/images/leopold-logo.png"
                    alt="Leopold"
                    width={397}
                    height={137}
                    priority
                    className="h-16 w-auto max-w-none"
                  />
                </Link>
                <MainNav />
                <div className="ml-auto">
                  <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />
                </div>
              </nav>
            </header>
            <div className="flex min-h-0 flex-1">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <main className="@container mx-auto max-w-4xl px-6 py-8">{children}</main>
              </div>
              <AgentPanel key={activeProfileId} initialCollapsed={panelCollapsed} />
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
