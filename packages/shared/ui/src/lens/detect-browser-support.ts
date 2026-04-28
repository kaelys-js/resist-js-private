/**
 * CSS feature detection and browser support analysis.
 *
 * Scans CSS/Svelte source files for modern CSS feature usage and maps
 * each detected feature to its minimum browser version from caniuse data.
 * This enables the Browser Support page to dynamically reflect the actual
 * CSS features used in the codebase.
 *
 * @example
 * const sources = { 'app.css': cssSource, 'Button.svelte': svelteSource };
 * const result = detectBrowserSupport(sources);
 * // result.features → [{ id: 'oklch', ... usageCount: 268, files: ['app.css'] }]
 * // result.browsers → [{ name: 'Chrome', minVersion: '117', ... }]
 *
 * @module
 */
import type { Num, Str } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A CSS feature that can be detected in source code. */
export type CssFeature = {
  /** Unique identifier. */
  id: Str;
  /** Human-readable feature name. */
  name: Str;
  /** Short description of the feature. */
  description: Str;
  /** Regex pattern to detect this feature in source code. */
  pattern: RegExp;
  /** MDN/caniuse reference URL. */
  url: Str;
  /** Minimum browser versions required for this feature. */
  support: BrowserVersions;
};

/** Minimum browser versions for a feature. */
export type BrowserVersions = {
  /** Minimum Chrome version. */
  chrome: Num;
  /** Minimum Firefox version. */
  firefox: Num;
  /** Minimum Safari version (can be decimal like 16.2). */
  safari: Num;
  /** Minimum Edge version. */
  edge: Num;
  /** Minimum Opera version. */
  opera: Num;
};

/** A detected CSS feature with usage information. */
export type DetectedFeature = {
  /** Feature identifier. */
  id: Str;
  /** Feature name. */
  name: Str;
  /** Feature description. */
  description: Str;
  /** caniuse/MDN URL. */
  url: Str;
  /** Minimum browser versions. */
  support: BrowserVersions;
  /** Number of times this feature appears in scanned sources. */
  usageCount: Num;
  /** File names where this feature was found. */
  files: Str[];
};

/** Browser support entry for display. */
export type BrowserSupport = {
  /** Browser name. */
  name: Str;
  /** Rendering engine. */
  engine: Str;
  /** Computed minimum version (highest across all detected features). */
  minVersion: Str;
  /** The feature that determines this minimum version. */
  limitingFeature: Str;
  /** Support status. */
  status: 'supported' | 'unsupported';
  /** Additional notes. */
  notes: Str;
  /** Category grouping. */
  category: Str;
};

/** Full browser support analysis result. */
export type BrowserSupportResult = {
  /** All detected CSS features with usage info. */
  features: DetectedFeature[];
  /** Computed browser support entries. */
  browsers: BrowserSupport[];
  /** Framework compatibility entries. */
  frameworks: FrameworkEntry[];
  /** Unsupported browser entries. */
  unsupported: BrowserSupport[];
};

/** Framework version entry. */
export type FrameworkEntry = {
  /** Framework name. */
  name: Str;
  /** Required version. */
  version: Str;
  /** Role/purpose. */
  role: Str;
  /** Category. */
  category: Str;
};

/* ------------------------------------------------------------------ */
/*  CSS Feature Registry (caniuse data as of March 2026)               */
/* ------------------------------------------------------------------ */

/**
 * Registry of modern CSS features with their detection patterns
 * and minimum browser versions from caniuse.com.
 *
 * Version data verified against caniuse.com as of March 2026.
 */
const CSS_FEATURES: CssFeature[] = [
  {
    id: 'oklch' as Str,
    name: 'oklch()' as Str,
    description: 'OKLCH perceptually uniform color space' as Str,
    pattern: /oklch\s*\(/g,
    url: 'https://caniuse.com/mdn-css_types_color_oklch' as Str,
    support: {
      chrome: 111 as Num,
      firefox: 113 as Num,
      safari: 15.4 as Num,
      edge: 111 as Num,
      opera: 97 as Num,
    },
  },
  {
    id: 'color-mix' as Str,
    name: 'color-mix()' as Str,
    description: 'Mix two colors in a given color space' as Str,
    pattern: /color-mix\s*\(/g,
    url: 'https://caniuse.com/mdn-css_types_color_color-mix' as Str,
    support: {
      chrome: 111 as Num,
      firefox: 113 as Num,
      safari: 16.2 as Num,
      edge: 111 as Num,
      opera: 97 as Num,
    },
  },
  {
    id: 'has' as Str,
    name: ':has()' as Str,
    description: 'Relational pseudo-class selector' as Str,
    pattern: /:has\s*\(/g,
    url: 'https://caniuse.com/css-has' as Str,
    support: {
      chrome: 105 as Num,
      firefox: 121 as Num,
      safari: 15.4 as Num,
      edge: 105 as Num,
      opera: 91 as Num,
    },
  },
  {
    id: 'container-queries' as Str,
    name: '@container' as Str,
    description: 'Size-based container queries' as Str,
    pattern: /@container\b|container-type\s*:/g,
    url: 'https://caniuse.com/css-container-queries' as Str,
    support: {
      chrome: 106 as Num,
      firefox: 110 as Num,
      safari: 16 as Num,
      edge: 106 as Num,
      opera: 94 as Num,
    },
  },
  {
    id: 'subgrid' as Str,
    name: 'subgrid' as Str,
    description: 'CSS Grid subgrid value' as Str,
    pattern: /subgrid/g,
    url: 'https://caniuse.com/css-subgrid' as Str,
    support: {
      chrome: 117 as Num,
      firefox: 71 as Num,
      safari: 16 as Num,
      edge: 117 as Num,
      opera: 103 as Num,
    },
  },
  {
    id: 'dvh' as Str,
    name: 'dvh/svh/lvh' as Str,
    description: 'Dynamic viewport height units' as Str,
    pattern: /\d+(?:dvh|svh|lvh)/g,
    url: 'https://caniuse.com/viewport-unit-variants' as Str,
    support: {
      chrome: 108 as Num,
      firefox: 101 as Num,
      safari: 15.4 as Num,
      edge: 108 as Num,
      opera: 94 as Num,
    },
  },
  {
    id: 'layer' as Str,
    name: '@layer' as Str,
    description: 'CSS Cascade Layers' as Str,
    pattern: /@layer\b/g,
    url: 'https://caniuse.com/css-cascade-layers' as Str,
    support: {
      chrome: 99 as Num,
      firefox: 97 as Num,
      safari: 15.4 as Num,
      edge: 99 as Num,
      opera: 85 as Num,
    },
  },
  {
    id: 'where' as Str,
    name: ':where()' as Str,
    description: 'Zero-specificity pseudo-class' as Str,
    pattern: /:where\s*\(/g,
    url: 'https://caniuse.com/mdn-css_selectors_where' as Str,
    support: {
      chrome: 88 as Num,
      firefox: 78 as Num,
      safari: 14 as Num,
      edge: 88 as Num,
      opera: 74 as Num,
    },
  },
  {
    id: 'nesting' as Str,
    name: 'CSS Nesting' as Str,
    description: 'Native CSS nesting with & selector' as Str,
    pattern: /&\s*[.#:[>+~]/g,
    url: 'https://caniuse.com/css-nesting' as Str,
    support: {
      chrome: 120 as Num,
      firefox: 117 as Num,
      safari: 17.2 as Num,
      edge: 120 as Num,
      opera: 106 as Num,
    },
  },
  {
    id: 'scope' as Str,
    name: '@scope' as Str,
    description: 'Scoped style rules' as Str,
    pattern: /@scope\b/g,
    url: 'https://caniuse.com/css-cascade-scope' as Str,
    support: {
      chrome: 118 as Num,
      firefox: 128 as Num,
      safari: 17.4 as Num,
      edge: 118 as Num,
      opera: 104 as Num,
    },
  },
  {
    id: 'starting-style' as Str,
    name: '@starting-style' as Str,
    description: 'Entry animations for elements' as Str,
    pattern: /@starting-style\b/g,
    url: 'https://caniuse.com/mdn-css_at-rules_starting-style' as Str,
    support: {
      chrome: 117 as Num,
      firefox: 129 as Num,
      safari: 17.5 as Num,
      edge: 117 as Num,
      opera: 103 as Num,
    },
  },
  {
    id: 'light-dark' as Str,
    name: 'light-dark()' as Str,
    description: 'Color function for light/dark mode' as Str,
    pattern: /light-dark\s*\(/g,
    url: 'https://caniuse.com/mdn-css_types_color_light-dark' as Str,
    support: {
      chrome: 123 as Num,
      firefox: 120 as Num,
      safari: 17.5 as Num,
      edge: 123 as Num,
      opera: 109 as Num,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Scanner                                                            */
/* ------------------------------------------------------------------ */

/**
 * Scan source files for CSS feature usage and compute browser support.
 *
 * @param sources - Map of filename → raw source content
 * @param frameworkVersions - Optional framework version overrides
 * @returns Full browser support analysis
 *
 * @example
 * const sources = { 'app.css': rawCss, 'Button.svelte': rawSvelte };
 * const result = detectBrowserSupport(sources);
 * console.log(result.browsers); // [{ name: 'Chrome', minVersion: '117', ... }]
 */
export function detectBrowserSupport(
  sources: Record<Str, Str>,
  frameworkVersions?: Partial<Record<Str, Str>>,
): BrowserSupportResult {
  const detected: DetectedFeature[] = [];

  /* Scan each feature across all source files */
  for (const feature of CSS_FEATURES) {
    let totalCount: Num = 0 as Num;
    const fileList: Str[] = [];

    for (const [filename, content] of Object.entries(sources)) {
      const matches: RegExpMatchArray | null = content.match(feature.pattern);
      if (matches && matches.length > 0) {
        totalCount = ((totalCount as number) + matches.length) as Num;
        fileList.push(filename as Str);
      }
    }

    if ((totalCount as number) > 0) {
      detected.push({
        id: feature.id,
        name: feature.name,
        description: feature.description,
        url: feature.url,
        support: feature.support,
        usageCount: totalCount,
        files: fileList,
      });
    }
  }

  /* Compute per-browser minimums */
  const browserMinimums: BrowserVersions = {
    chrome: 0 as Num,
    firefox: 0 as Num,
    safari: 0 as Num,
    edge: 0 as Num,
    opera: 0 as Num,
  };

  const limitingFeatures: Record<keyof BrowserVersions, Str> = {
    chrome: '' as Str,
    firefox: '' as Str,
    safari: '' as Str,
    edge: '' as Str,
    opera: '' as Str,
  };

  for (const feat of detected) {
    for (const browser of ['chrome', 'firefox', 'safari', 'edge', 'opera'] as const) {
      if ((feat.support[browser] as number) > (browserMinimums[browser] as number)) {
        browserMinimums[browser] = feat.support[browser];
        limitingFeatures[browser] = feat.name;
      }
    }
  }

  /* Build browser support entries */
  const browsers: BrowserSupport[] = [
    {
      name: 'Chrome' as Str,
      engine: 'Blink' as Str,
      minVersion: `${browserMinimums.chrome}+` as Str,
      limitingFeature: limitingFeatures.chrome,
      status: 'supported',
      notes: `Requires ${limitingFeatures.chrome}` as Str,
      category: 'Desktop' as Str,
    },
    {
      name: 'Edge' as Str,
      engine: 'Blink' as Str,
      minVersion: `${browserMinimums.edge}+` as Str,
      limitingFeature: limitingFeatures.edge,
      status: 'supported',
      notes: `Requires ${limitingFeatures.edge}` as Str,
      category: 'Desktop' as Str,
    },
    {
      name: 'Firefox' as Str,
      engine: 'Gecko' as Str,
      minVersion: `${browserMinimums.firefox}+` as Str,
      limitingFeature: limitingFeatures.firefox,
      status: 'supported',
      notes: `Requires ${limitingFeatures.firefox}` as Str,
      category: 'Desktop' as Str,
    },
    {
      name: 'Safari' as Str,
      engine: 'WebKit' as Str,
      minVersion: `${browserMinimums.safari}+` as Str,
      limitingFeature: limitingFeatures.safari,
      status: 'supported',
      notes: `Requires ${limitingFeatures.safari}` as Str,
      category: 'Desktop' as Str,
    },
    {
      name: 'Opera' as Str,
      engine: 'Blink' as Str,
      minVersion: `${browserMinimums.opera}+` as Str,
      limitingFeature: limitingFeatures.opera,
      status: 'supported',
      notes: `Requires ${limitingFeatures.opera}` as Str,
      category: 'Desktop' as Str,
    },
  ];

  /* Unsupported browsers (static) */
  const unsupported: BrowserSupport[] = [
    {
      name: 'Internet Explorer' as Str,
      engine: 'Trident' as Str,
      minVersion: 'N/A' as Str,
      limitingFeature: '' as Str,
      status: 'unsupported',
      notes: 'End of life — no modern CSS support' as Str,
      category: 'Unsupported' as Str,
    },
    {
      name: 'Opera Mini' as Str,
      engine: 'Presto' as Str,
      minVersion: 'N/A' as Str,
      limitingFeature: '' as Str,
      status: 'unsupported',
      notes: 'Limited CSS support — no oklch, container queries, or subgrid' as Str,
      category: 'Unsupported' as Str,
    },
    {
      name: 'UC Browser' as Str,
      engine: 'Various' as Str,
      minVersion: 'N/A' as Str,
      limitingFeature: '' as Str,
      status: 'unsupported',
      notes: 'Non-standard rendering — inconsistent CSS support' as Str,
      category: 'Unsupported' as Str,
    },
  ];

  /* Framework entries */
  const fv: Partial<Record<Str, Str>> = frameworkVersions ?? {};
  const frameworks: FrameworkEntry[] = [
    {
      name: 'Svelte' as Str,
      version: (fv.svelte ?? '5+') as Str,
      role: 'UI framework with runes reactivity' as Str,
      category: 'Framework' as Str,
    },
    {
      name: 'SvelteKit' as Str,
      version: (fv.sveltekit ?? '2+') as Str,
      role: 'Full-stack application framework' as Str,
      category: 'Framework' as Str,
    },
    {
      name: 'TypeScript' as Str,
      version: (fv.typescript ?? '5.7+') as Str,
      role: 'Type-safe development' as Str,
      category: 'Framework' as Str,
    },
    {
      name: 'Node.js' as Str,
      version: (fv.node ?? '25+') as Str,
      role: 'Server-side rendering' as Str,
      category: 'Framework' as Str,
    },
  ];

  return { features: detected, browsers, frameworks, unsupported };
}
