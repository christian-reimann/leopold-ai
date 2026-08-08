'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const NAV_LINKS = [
  { href: '/profile', label: 'Mein Profil' },
  { href: '/search-queries', label: 'Suchaufträge' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/applications', label: 'Bewerbungen' },
];

export function MainNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="hidden items-center gap-10 md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-heading text-lg whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
        aria-expanded={open}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-background p-3 shadow-sm md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 font-heading text-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
