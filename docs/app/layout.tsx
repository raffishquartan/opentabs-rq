import { Toaster } from '@/components/retroui';
import TopNav from '@/components/TopNav';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './global.css';
import type { Metadata } from 'next';
import { Archivo_Black, Space_Grotesk, Space_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

const sans = Space_Grotesk({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-sans',
  display: 'swap',
});

const head = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-head',
  display: 'swap',
});

const mono = Space_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpenTabs — AI agents for any web app',
  description:
    'OpenTabs gives AI agents access to any web application through your authenticated browser session. MCP server + Chrome extension + plugin SDK.',
  openGraph: {
    title: 'OpenTabs — AI agents for any web app',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const darkMode = localStorage.getItem('darkMode');
                  if (darkMode === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.error('Error applying theme:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${head.variable} ${sans.variable} ${mono.variable}`}>
        <ThemeProvider>
          <div className="bg-background text-foreground">
            <a
              href="#main-content"
              className="sr-only bg-primary text-foreground focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:font-bold">
              Skip to main content
            </a>
            <TopNav />
            <main id="main-content">{children}</main>
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
