import TopNav from "@/components/TopNav";
import "./global.css";
import { Archivo_Black, Space_Grotesk, Space_Mono } from "next/font/google";
import { Metadata } from "next";
import { Toaster } from "@/components/retroui";
import { ThemeProvider } from "@/contexts/ThemeContext";

const sans = Space_Grotesk({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
  display: "swap",
});

const head = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-head",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpenTabs — AI agents for any web app",
  description:
    "OpenTabs gives AI agents access to any web application through your authenticated browser session. MCP server + Chrome extension + plugin SDK.",
  openGraph: {
    title: "OpenTabs — AI agents for any web app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <TopNav />
            {children}
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
