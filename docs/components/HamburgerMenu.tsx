'use client';

import { AlignJustify, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/retroui';
import SideNav from './SideNav';

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        className="p-2"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setIsOpen(prev => !prev)}>
        {isOpen ? <X className="h-4 w-4" /> : <AlignJustify className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="fixed inset-0 h-screen w-full bg-foreground/50"
          onClick={close}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') close();
          }}
        />
      )}

      {isOpen && (
        <div id="mobile-menu" role="dialog" aria-modal="true" className="fixed top-0 bottom-0 left-0 z-10 h-screen">
          <SideNav setIsOpen={setIsOpen} />
        </div>
      )}
    </div>
  );
}
