import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // Next.js app router entry points
    'app/**/{page,layout,error,loading,not-found,route,template,default}.{ts,tsx}',
    'app/**/robots.ts',
    'app/**/sitemap.ts',
    // Config files
    'content-collections.ts',
  ],
  project: ['**/*.{ts,tsx}', '!.content-collections/**'],
  ignoreDependencies: [
    // animate plugin — imported via @import in CSS, not a static JS import
    'tw-animate-css',
    // Tailwind v4 — used by PostCSS plugin, not directly imported in JS
    'tailwindcss',
    // postcss-load-config is a peer dependency of postcss, resolved at runtime
    'postcss-load-config',
    // unist is a type-only stub resolved automatically via @types/unist
    'unist',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
