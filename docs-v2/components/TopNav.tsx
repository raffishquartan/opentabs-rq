"use client";
import React from "react";
import Link from "next/link";
import { GithubIcon, MoonIcon, SunIcon } from "lucide-react";
import HamburgerMenu from "./HamburgerMenu";
import { Button } from "@/components/retroui";
import { navConfig } from "@/config/navigation";
import { useTheme } from "@/contexts/ThemeContext";

export default function TopNav() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <nav className="sticky z-1 top-0 right-0 w-full border-b-2 bg-background">
      <div className="container max-w-6xl px-4 lg:px-0 mx-auto">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="shrink-0">
            <Link
              href="/"
              className="text-black font-head text-2xl flex items-end"
            >
              <div className="text-foreground">OpenTabs</div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-4">
            {navConfig.topNavItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="hover:underline decoration-primary underline-offset-2 transition-all"
              >
                {item.title}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4 lg:hidden">
            <Link
              href="https://github.com/AnomalyCo/opentabs"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon />
            </Link>
            <HamburgerMenu />
          </div>

          <div className="hidden lg:flex items-center space-x-3">
            <Link
              href="https://github.com/AnomalyCo/opentabs"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="icon">
                <GithubIcon size="14" />
              </Button>
            </Link>
            <Button variant="secondary" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? <SunIcon size="14" /> : <MoonIcon size="14" />}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
