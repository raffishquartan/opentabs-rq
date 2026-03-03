'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Text } from '@/components/retroui';
import { navConfig } from '@/config/navigation';
import { cn } from '@/lib/utils';

interface SideNavProps {
  setIsOpen?: (isOpen: boolean) => void;
}

export default function SideNav({ setIsOpen }: SideNavProps) {
  const pathname = usePathname();

  return (
    <div className="sidebar-scroll flex h-full w-full flex-col justify-start overflow-y-scroll overscroll-y-contain border-border border-r-2 bg-background py-8">
      <nav className="flex flex-col items-start space-y-4 px-6" aria-label="Main navigation">
        {navConfig.sideNavItems.map(item => (
          <div key={item.title} className="w-full">
            <Text as="h5">{item.title}</Text>
            <div className="flex w-full flex-col">
              {item.children.map(child => (
                <Link
                  key={child.title}
                  href={child.href}
                  onClick={() => setIsOpen?.(false)}
                  target={child.href.startsWith('http') ? '_blank' : '_self'}
                  className={cn(
                    'flex w-full items-center justify-between border border-transparent px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
                    pathname === child.href && 'bg-primary text-primary-foreground',
                  )}>
                  {child.title}
                  {child.tag && (
                    <Badge
                      size="sm"
                      className="border-2 border-border bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                      {child.tag}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
