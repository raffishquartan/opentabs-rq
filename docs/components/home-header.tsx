'use client';

import { RetroThemeToggle } from '@/components/retro-theme-toggle';
import { cn } from '@/lib/utils';
import * as Collapsible from '@radix-ui/react-collapsible';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { ChevronDown, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const navLinks = [
  { href: '/docs', label: 'Docs' },
  { href: '/docs/guides/installation', label: 'Get Started' },
];

export const HomeHeader = () => {
  const { setOpenSearch, enabled, hotKey } = useSearchContext();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <header id="nd-global-header" className="border-border bg-background sticky top-0 z-40 border-b-2">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/" className="font-head inline-flex items-center gap-2 text-xl">
            <img src="/icon.svg" alt="" width={32} height={32} className="size-8" />
            OpenTabs
          </Link>

          {/* Desktop nav links */}
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground rounded px-3 py-1.5 font-sans text-sm font-medium transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          {enabled && (
            <>
              {/* Desktop: wide search bar */}
              <button
                type="button"
                data-search-full=""
                onClick={() => setOpenSearch(true)}
                className={cn(
                  'border-border bg-background text-muted-foreground ml-auto hidden items-center gap-2 rounded border-2 px-3 py-1.5 text-sm shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none',
                  'lg:inline-flex lg:w-56 xl:w-64',
                )}>
                <Search className="size-3.5 shrink-0" />
                <span className="font-sans">Search...</span>
                {hotKey.length > 0 && (
                  <div className="ml-auto inline-flex gap-0.5">
                    {hotKey.map((k, i) => (
                      <kbd key={i} className="border-border bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                        {k.display}
                      </kbd>
                    ))}
                  </div>
                )}
              </button>
              {/* Mobile: icon button */}
              <button
                type="button"
                aria-label="Search"
                onClick={() => setOpenSearch(true)}
                className="border-border bg-background ml-auto flex min-h-11 min-w-11 items-center justify-center rounded border-2 p-2 shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none lg:hidden">
                <Search className="size-4" />
              </button>
            </>
          )}
          {!enabled && <div className="ml-auto" />}

          {/* Desktop: theme toggle */}
          <RetroThemeToggle className="hidden lg:flex" />

          {/* Mobile: collapsible menu trigger */}
          <Collapsible.Trigger asChild>
            <button
              type="button"
              aria-label="Toggle navigation menu"
              className="border-border bg-background flex min-h-11 min-w-11 items-center justify-center rounded border-2 p-2 shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none lg:hidden">
              <Menu className={cn('size-4 transition-transform', open && 'hidden')} aria-hidden={open} />
              <ChevronDown className={cn('size-4 transition-transform', !open && 'hidden')} aria-hidden={!open} />
            </button>
          </Collapsible.Trigger>
        </div>

        {/* Mobile collapsible panel */}
        <Collapsible.Content className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden border-t-2 lg:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex min-h-11 items-center rounded px-3 font-sans text-sm font-medium transition-colors">
                {link.label}
              </Link>
            ))}
            <div className="border-border my-1 border-t" />
            <div className="flex items-center gap-2 px-3 py-1">
              <span className="text-muted-foreground font-sans text-sm">Theme</span>
              <RetroThemeToggle />
            </div>
          </nav>
        </Collapsible.Content>
      </header>
    </Collapsible.Root>
  );
};
