"use client";

import { navConfig } from "@/config/navigation";
import { Badge, Text } from "@/components/retroui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SideNavProps {
  setIsOpen?: (isOpen: boolean) => void;
}

export default function SideNav({ setIsOpen }: SideNavProps) {
  const pathname = usePathname();

  return (
    <div className="sidebar-scroll border-r-2 border-border z-10 overflow-y-scroll h-full max-h-[calc(100vh-6rem)] transition-transform transform md:translate-x-0 w-full bg-background flex flex-col justify-start md:justify-start py-8">
      <nav
        className="flex flex-col items-start max-lg:px-6 space-y-4 z-99"
        aria-label="Main navigation"
      >
        {navConfig.sideNavItems.map((item) => (
          <div key={item.title} className="w-full">
            <Text as="h5">{item.title}</Text>
            <div className="flex flex-col w-full">
              {item.children.map((child) => (
                <Link
                  key={child.title}
                  href={child.href}
                  onClick={() => setIsOpen && setIsOpen(false)}
                  target={child.href.startsWith("http") ? "_blank" : "_self"}
                  className={cn(
                    "px-2 py-1 w-full border-2 border-transparent text-muted-foreground flex items-center justify-between hover:text-foreground hover:bg-muted/50 transition-colors rounded-(--radius)",
                    pathname === child.href &&
                      "bg-primary text-primary-foreground border-border",
                  )}
                >
                  {child.title}
                  {child.tag && (
                    <Badge
                      size="sm"
                      className="py-0.5 px-1.5 border-2 border-border text-xs text-muted-foreground bg-muted"
                    >
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
