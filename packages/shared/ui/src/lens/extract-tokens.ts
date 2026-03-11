/**
 * CSS design token extraction from raw app.css source.
 *
 * Parses `:root`, `.dark`, and `[data-theme='...']` blocks to extract
 * CSS custom property definitions grouped by semantic category.
 */
import type { Str } from '@/schemas/common';

/** A single CSS custom property token. */
export type DesignToken = {
  /** CSS variable name without `--` prefix (e.g., `background`, `primary`). */
  name: Str;
  /** CSS variable name with `--` prefix (e.g., `--background`, `--primary`). */
  variable: Str;
  /** The raw CSS value (e.g., `oklch(1 0 0)`, `0.625rem`). */
  value: Str;
  /** Semantic category for grouping. */
  category: TokenCategory;
  /** Tailwind utility class name (e.g., `bg-background`, `text-primary`). */
  tailwindClass: Str;
};

/** Token category for display grouping. */
export type TokenCategory = 'color' | 'sidebar-color' | 'radius' | 'typography' | 'animation';

/** A group of tokens sharing the same category. */
export type TokenGroup = {
  /** Category key. */
  category: TokenCategory;
  /** Human-readable label. */
  label: Str;
  /** Tokens in this group. */
  tokens: DesignToken[];
};

/** Tokens for a single theme context (e.g., `:root`, `.dark`, `[data-theme='midnight']`). */
export type ThemeTokenSet = {
  /** Theme selector (e.g., `:root`, `.dark`, `midnight`, `midnight.dark`). */
  selector: Str;
  /** Human-readable label. */
  label: Str;
  /** All tokens in this context. */
  tokens: DesignToken[];
};

/**
 * Map of CSS variable name → Tailwind utility class.
 * Only covers the semantic color tokens mapped via `@theme inline`.
 */
const TAILWIND_MAP: Record<Str, Str> = {
  background: 'bg-background',
  foreground: 'text-foreground',
  card: 'bg-card',
  'card-foreground': 'text-card-foreground',
  popover: 'bg-popover',
  'popover-foreground': 'text-popover-foreground',
  primary: 'bg-primary',
  'primary-foreground': 'text-primary-foreground',
  secondary: 'bg-secondary',
  'secondary-foreground': 'text-secondary-foreground',
  muted: 'bg-muted',
  'muted-foreground': 'text-muted-foreground',
  accent: 'bg-accent',
  'accent-foreground': 'text-accent-foreground',
  destructive: 'bg-destructive',
  'destructive-foreground': 'text-destructive-foreground',
  border: 'border-border',
  input: 'border-input',
  ring: 'ring-ring',
  radius: 'rounded-lg',
  sidebar: 'bg-sidebar',
  'sidebar-foreground': 'text-sidebar-foreground',
  'sidebar-primary': 'bg-sidebar-primary',
  'sidebar-primary-foreground': 'text-sidebar-primary-foreground',
  'sidebar-accent': 'bg-sidebar-accent',
  'sidebar-accent-foreground': 'text-sidebar-accent-foreground',
  'sidebar-border': 'border-sidebar-border',
  'sidebar-ring': 'ring-sidebar-ring',
};

/**
 * Classify a CSS variable name into a token category.
 *
 * @param name - Variable name without `--` prefix
 * @returns Token category
 */
function classifyToken(name: Str): TokenCategory {
  if (name.startsWith('sidebar')) return 'sidebar-color';
  if (name === 'radius') return 'radius';
  if (name.startsWith('font-') || name.startsWith('animate-')) return 'animation';
  return 'color';
}

/**
 * Parse CSS custom properties from a single CSS block body.
 *
 * @param blockBody - The content between `{` and `}` of a CSS rule
 * @returns Array of design tokens
 */
function parseBlock(blockBody: Str): DesignToken[] {
  const tokens: DesignToken[] = [];
  const propRegex: RegExp = /--([a-z][\w-]*):\s*([^;]+);/g;
  let match: RegExpExecArray | null = propRegex.exec(blockBody);

  while (match !== null) {
    const name: Str = match[1] ?? '';
    const value: Str = (match[2] ?? '').trim();

    // Skip Tailwind's `--color-*` mappings (they just reference the base vars)
    if (!name.startsWith('color-') && !name.startsWith('bits-')) {
      tokens.push({
        name,
        variable: `--${name}`,
        value,
        category: classifyToken(name),
        tailwindClass: TAILWIND_MAP[name] ?? '',
      });
    }

    match = propRegex.exec(blockBody);
  }
  return tokens;
}

/**
 * Extract all design tokens from raw app.css source.
 *
 * Parses `:root`, `.dark`, and `[data-theme='...']` blocks to build
 * a complete token registry for all theme contexts.
 *
 * @param cssSource - Raw CSS source string (app.css content)
 * @returns Array of theme token sets
 */
export function extractTokens(cssSource: Str): ThemeTokenSet[] {
  const sets: ThemeTokenSet[] = [];

  // Match :root { ... }
  const rootMatch: RegExpExecArray | null = /:root\s*\{([^}]+)\}/s.exec(cssSource);
  if (rootMatch) {
    sets.push({
      selector: ':root',
      label: 'Light (Default)',
      tokens: parseBlock(rootMatch[1] ?? ''),
    });
  }

  // Match .dark { ... } (base dark, not theme-specific)
  const darkMatch: RegExpExecArray | null = /\.dark\s*\{([^}]+)\}/s.exec(cssSource);
  if (darkMatch) {
    sets.push({
      selector: '.dark',
      label: 'Dark (Default)',
      tokens: parseBlock(darkMatch[1] ?? ''),
    });
  }

  // Match [data-theme='name'] { ... } and [data-theme='name'].dark { ... }
  const themeRegex: RegExp = /\[data-theme='([^']+)'\](\.dark)?\s*\{([^}]+)\}/g;
  let themeMatch: RegExpExecArray | null = themeRegex.exec(cssSource);
  while (themeMatch !== null) {
    const themeName: Str = themeMatch[1] ?? '';
    const isDark: boolean = themeMatch[2] === '.dark';
    const body: Str = themeMatch[3] ?? '';
    const label: Str = `${themeName.charAt(0).toUpperCase()}${themeName.slice(1)}${isDark ? ' (Dark)' : ' (Light)'}`;

    sets.push({
      selector: isDark ? `${themeName}.dark` : themeName,
      label,
      tokens: parseBlock(body),
    });

    themeMatch = themeRegex.exec(cssSource);
  }

  return sets;
}

/**
 * Group tokens by semantic category for display.
 *
 * @param tokens - Flat array of design tokens
 * @returns Grouped token arrays with labels
 */
export function groupTokens(tokens: DesignToken[]): TokenGroup[] {
  const categoryLabels: Record<TokenCategory, Str> = {
    color: 'Colors',
    'sidebar-color': 'Sidebar',
    radius: 'Radius',
    typography: 'Typography',
    animation: 'Animation',
  };

  const categoryOrder: TokenCategory[] = [
    'color',
    'sidebar-color',
    'radius',
    'typography',
    'animation',
  ];

  return categoryOrder
    .map(
      (cat: TokenCategory): TokenGroup => ({
        category: cat,
        label: categoryLabels[cat],
        tokens: tokens.filter((t: DesignToken): boolean => t.category === cat),
      }),
    )
    .filter((g: TokenGroup): boolean => g.tokens.length > 0);
}

/**
 * Get all unique theme names from the extracted token sets.
 *
 * @param sets - Theme token sets from extractTokens
 * @returns Array of theme names (e.g., ['midnight', 'warm', 'forest'])
 */
export function getThemeNames(sets: ThemeTokenSet[]): Str[] {
  const names: Set<Str> = new Set();
  for (const s of sets) {
    // Extract theme name from selectors like 'midnight', 'midnight.dark'
    const baseName: Str = s.selector.replace('.dark', '').trim();
    if (baseName !== ':root' && baseName !== '' && baseName !== '.dark') {
      names.add(baseName);
    }
  }
  return [...names].toSorted();
}
