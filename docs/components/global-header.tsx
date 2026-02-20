'use client';

import { RetroThemeToggle } from '@/components/retro-theme-toggle';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from 'fumadocs-ui/components/sidebar/base';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Menu, Search } from 'lucide-react';
import Link from 'next/link';

interface GlobalHeaderProps {
  /** Render the mobile sidebar hamburger trigger (docs pages only). */
  showSidebarTrigger?: boolean;
}

export const GlobalHeader = ({ showSidebarTrigger }: GlobalHeaderProps) => {
  const { setOpenSearch, enabled, hotKey } = useSearchContext();

  return (
    <header
      id="nd-global-header"
      className="border-border bg-background sticky top-0 z-40 flex h-14 items-center gap-2 border-b-2 px-4">
      {showSidebarTrigger && (
        <SidebarTrigger
          aria-label="Toggle sidebar"
          className="border-border bg-background flex min-h-11 min-w-11 items-center justify-center rounded border-2 p-2 shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none md:hidden">
          <Menu className="size-4" />
        </SidebarTrigger>
      )}
      <Link href="/" className="font-head inline-flex items-center gap-2 text-xl">
        <img src="/icon.svg" alt="" width={32} height={32} className="size-8" />
        OpenTabs
      </Link>
      {enabled && (
        <>
          {/* Desktop: wide search bar */}
          <button
            type="button"
            data-search-full=""
            onClick={() => setOpenSearch(true)}
            className={cn(
              'border-border bg-background text-muted-foreground ml-auto hidden items-center gap-2 rounded border-2 px-3 py-1.5 text-sm shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none',
              'md:inline-flex md:w-56 lg:w-64',
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
            className="border-border bg-background ml-auto flex min-h-11 min-w-11 items-center justify-center rounded border-2 p-2 shadow-sm transition-all hover:translate-y-0.5 hover:shadow-none md:hidden">
            <Search className="size-4" />
          </button>
        </>
      )}
      {!enabled && <div className="ml-auto" />}
      <RetroThemeToggle />
    </header>
  );
};
