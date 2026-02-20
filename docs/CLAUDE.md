# Docs Project Instructions

## Overview

The OpenTabs documentation site built with [Fumadocs](https://fumadocs.vercel.app/) (Next.js) and a custom "RetroUI" design system. Content is authored in MDX, rendered via Fumadocs, and styled with Tailwind CSS 4.

## Tech Stack

- **Framework:** Next.js 16 (static export via `next build`)
- **Content:** Fumadocs MDX (`fumadocs-mdx` + `fumadocs-ui`)
- **Styling:** Tailwind CSS 4 (CSS-first config — no `tailwind.config.js`)
- **UI primitives:** Radix UI (Accordion, Tabs, Collapsible, Slot)
- **Fonts:** Archivo Black (headings), Space Grotesk (body), Space Mono (code)

## Commands

```bash
bun run build         # next build (static export)
bun run type-check    # tsc --noEmit
bun run lint          # eslint
bun run knip          # unused code detection
```

All four must pass. This project has no test suite.

## Directory Structure

```
docs/
├── app/
│   ├── global.css              # THE theme definition — single source of truth
│   ├── layout.tsx              # Root layout (fonts, Provider)
│   ├── page.tsx                # Homepage
│   └── docs/                   # Docs pages (Fumadocs DocsLayout)
├── components/
│   ├── retroui/                # Standalone RetroUI primitives (Button, Badge)
│   ├── retro-*.tsx             # Docs-specific RetroUI components
│   ├── retroui-codeblock.tsx   # Code block with copy button
│   └── global-header.tsx       # Shared header across all pages
├── content/                    # MDX content files
├── mdx-components.tsx          # MDX component overrides (headings, tables, cards, callouts, etc.)
└── lib/
    ├── utils.ts                # cn() helper
    └── layout.shared.tsx       # Shared layout options
```

---

## The Theme Is the Design System

`app/global.css` defines the complete visual language — colors, radius, shadows, and fonts — as CSS custom properties. The `@theme inline` block bridges these to Tailwind utility classes. **The theme is not a suggestion. It is the specification.** Every component must reference theme tokens; nothing may be hardcoded or overridden by aesthetic preference.

### Respect the theme. Always.

- **Use theme-aware Tailwind classes for everything.** Colors (`bg-primary`, `text-foreground`, `border-border`), radius (`rounded`), shadows (`shadow-md`), fonts (`font-head`, `font-sans`, `font-mono`). These classes resolve to CSS variables defined in `global.css`.
- **Never hardcode values that the theme provides.** No hex colors in className strings. No Tailwind default palette colors (`bg-yellow-400`, `text-gray-500`). No inline style color/radius overrides. No arbitrary values (`bg-[#ffdb33]`, `rounded-[8px]`). If a value exists as a theme variable, use the corresponding Tailwind class.
- **Never override the theme's aesthetic choices.** The theme defines `--radius: 0.5rem` — every bordered container uses `rounded`. The theme defines flat offset shadows — every card uses `shadow-md`. Do not substitute different values because they "look better" or "feel more appropriate for the style." The design system is intentional and internally consistent. Changing one aspect (e.g., removing border-radius to look "more neobrutalist") breaks the cohesion.
- **Never change theme variable values** in `:root` or `.dark` without explicit approval from the user. These values are the brand identity.

### The theme at a glance

The full definitions live in `global.css`. Key tokens:

| Token          | Light     | Dark      | Tailwind class    |
| -------------- | --------- | --------- | ----------------- |
| `--radius`     | `0.5rem`  | (same)    | `rounded`         |
| `--background` | `#fff`    | `#1a1a1a` | `bg-background`   |
| `--foreground` | `#000`    | `#f5f5f5` | `text-foreground` |
| `--primary`    | `#ffdb33` | `#ffdb33` | `bg-primary`      |
| `--border`     | `#000`    | `#5c5c5c` | `border-border`   |
| `--card`       | `#fff`    | `#242424` | `bg-card`         |
| `--muted`      | `#cccccc` | `#3f3f46` | `bg-muted`        |

Shadows are flat offsets using `var(--border)` — no blur, no spread. Fonts: `font-head` (Archivo Black), `font-sans` (Space Grotesk), `font-mono` (Space Mono).

### Component pattern

Every bordered container in this design system follows the same recipe:

```
rounded border-2 border-border bg-card shadow-md
```

Interactive containers add a press-down hover effect:

```
transition-all hover:translate-y-0.5 hover:shadow
```

If a component has `border-2`, it should also have `rounded`. If it has `shadow-md`, it should use the theme shadow (which already references `var(--border)`). There are no exceptions to this pattern.

---

## Fumadocs Integration

RetroUI styling is applied to Fumadocs via three layers:

1. **`@theme inline`** — Maps CSS variables to both Tailwind tokens (`--color-*`) and Fumadocs tokens (`--color-fd-*`)
2. **CSS overrides in `global.css`** — Targets Fumadocs DOM elements by ID (`#nd-sidebar`, `#nd-toc`, `#nd-docs-layout`) and data attributes
3. **MDX component overrides** — `mdx-components.tsx` replaces Fumadocs defaults with RetroUI-styled versions

When overriding Fumadocs elements via CSS, use existing patterns in `global.css`. Check for existing selectors before adding new ones.

---

## Sizing Constraints

Elements nested inside fixed-height containers (e.g., a copy button inside a `min-h-10` title bar) must respect their parent's dimensions. Do not apply blanket sizing rules (like 44px touch targets) to elements inside constrained containers — this causes overflow. Touch target minimums apply to standalone interactive elements, not to every button in every context.
