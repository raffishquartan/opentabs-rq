import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    // Next.js app router entry points
    "app/**/{page,layout,error,loading,not-found,route,template,default}.{ts,tsx}",
    "app/**/robots.ts",
    "app/**/sitemap.ts",
    // Config files
    "content-collections.ts",
  ],
  project: ["**/*.{ts,tsx}", "!.content-collections/**"],
  ignoreDependencies: [
    // animate plugin — imported via @import in CSS, not a static JS import
    "tw-animate-css",
    // Tailwind v4 — used by PostCSS plugin, not directly imported in JS
    "tailwindcss",
    // postcss-load-config is a peer dependency of postcss, resolved at runtime
    "postcss-load-config",
  ],
  ignoreMembers: [
    // Theme enum values are iterated via Object.values(ColorTheme) in ThemeContext
    // Knip cannot trace runtime Object.values() usage
    "Purple",
    "Lime",
    "Red",
    "Lavender",
    "Orange",
    "Green",
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
