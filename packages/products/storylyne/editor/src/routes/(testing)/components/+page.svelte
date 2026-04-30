<script lang="ts">
  /**
   * Lens Overview — dashboard hub for the component library.
   *
   * Displays stats, health metrics, explore hub cards, categories at a glance,
   * popular tags, and recent activity feed.
   *
   * @module
   */
  import type { Num, Str } from '@/schemas/common';
  import type { LensMeta, CategoryGroup } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    type LensCompatibility,
  } from '@/ui/lens/lens-utils.js';
  import { extractTokens, type ThemeTokenSet } from '@/ui/lens/extract-tokens.js';
  import { log } from '@/utils/core/logger';
  import Badge from '@/ui/badge/badge.svelte';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { getContext, type Component } from 'svelte';
  import { slide } from 'svelte/transition';
  import { page } from '$app/stores';
  import {
    CATEGORY_ORDER,
    CATEGORY_ICONS,
    CATEGORY_COLORS,
    CATEGORY_BG,
    categoryLabel as catLabel,
    LENS_RULE_NAMES,
  } from '$lib/config/lens-categories';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Palette from '@lucide/svelte/icons/palette';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import TagIcon from '@lucide/svelte/icons/tag';
  import Shapes from '@lucide/svelte/icons/shapes';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Newspaper from '@lucide/svelte/icons/newspaper';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import List from '@lucide/svelte/icons/list';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Info from '@lucide/svelte/icons/info';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
  import AccessibilityIcon from '@lucide/svelte/icons/accessibility';
  import Globe from '@lucide/svelte/icons/globe';
  import {
    auditAccessibility,
    type A11yRuleResult,
    type A11yAuditResult,
  } from '@/ui/lens/detect-accessibility.js';
  import {
    detectBrowserSupport,
    type BrowserSupportResult,
  } from '@/ui/lens/detect-browser-support.js';

  /* ------------------------------------------------------------------ */
  /*  Glob-based data (mirrors layout pattern)                           */
  /* ------------------------------------------------------------------ */

  /** All .svelte files in @/ui for component directory discovery. */
  const allModules: Record<Str, unknown> = import.meta.glob('@/ui/*/*.svelte');

  /** Eager lens.ts metadata for category, description, tags. */
  const lensMetaModules: Record<Str, { meta?: LensMeta; default?: unknown; examples?: unknown }> =
    import.meta.glob('@/ui/*/lens.ts', { import: '*', eager: true }) as Record<
      Str,
      { meta?: LensMeta; default?: unknown; examples?: unknown }
    >;

  /** Raw app.css for token count. */
  const cssRawModules: Record<Str, Str> = import.meta.glob('/src/app.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /* ------------------------------------------------------------------ */
  /*  Derived data                                                       */
  /* ------------------------------------------------------------------ */

  /** Sorted unique component directory names. */
  const componentNames: Str[] = [...new Set(Object.keys(allModules).map(extractDir))]
    .filter((n: Str): boolean => n.length > 0)
    .toSorted();

  /** Metadata lookup by component name. */
  const metaByName: Map<Str, LensMeta> = new Map();

  for (const [key, mod] of Object.entries(lensMetaModules)) {
    const dir: Str = extractDir(key);

    if (mod.meta) {
      const result: Result<LensMeta> = parseLensMeta(mod.meta);

      if (result.ok) {
        metaByName.set(dir, {
          ...result.data,
          tags: [...result.data.tags],
          breakingChanges: result.data.breakingChanges?.map((bc) => ({ ...bc })),
        });
      } else {
        log.warn(`Invalid lens.ts for "${dir}": ${result.error.message}`);
      }
    }
  }

  /** Components grouped by category. */
  const groupedComponents: CategoryGroup[] = CATEGORY_ORDER.map(
    (cat: Str): CategoryGroup => ({
      name: cat,
      label: catLabel(cat),
      components: componentNames.filter((n: Str): boolean => {
        const m: LensMeta | undefined = metaByName.get(n);

        return (m?.category ?? 'display') === cat;
      }),
    }),
  ).filter((g: CategoryGroup): boolean => g.components.length > 0);

  /** Total design token count (sum across all theme sets). */
  const tokenCount: Num = (() => {
    const entries: Array<[Str, Str]> = Object.entries(cssRawModules);

    if (entries.length === 0) {
      return 0 as Num;
    }

    const [, css]: [Str, Str] = entries[0] as [Str, Str];
    const sets: ThemeTokenSet[] = extractTokens(css);

    return sets.reduce(
      (sum: Num, s: ThemeTokenSet): Num => (sum + s.tokens.length) as Num,
      0 as Num,
    );
  })();

  /* ------------------------------------------------------------------ */
  /*  Accessibility + browser support scanning                           */
  /* ------------------------------------------------------------------ */

  /** Raw source files for accessibility scanning. */
  const a11ySourceModules: Record<Str, Str> = import.meta.glob(
    ['/src/**/*.{svelte,css}', '/../../../shared/ui/src/**/*.{svelte,css,ts}'],
    { query: '?raw', import: 'default', eager: true },
  ) as unknown as Record<Str, Str>;

  /**
   * Convert a glob path to a workspace-relative path.
   *
   * @param globPath - Path from import.meta.glob
   * @returns Workspace-relative path
   */
  function toWorkspacePath(globPath: Str): Str {
    const s: string = globPath as string;
    const sharedIdx: number = s.indexOf('/shared/');

    if (sharedIdx >= 0) {
      return s.slice(sharedIdx + 1) as Str;
    }
    return `editor${s}` as Str;
  }

  /** Workspace-relative source map for the accessibility scanner. */
  const a11yScanSources: Record<Str, Str> = Object.fromEntries(
    Object.entries(a11ySourceModules).map(([path, content]: [Str, unknown]): [Str, Str] => [
      toWorkspacePath(path as Str),
      String(content) as Str,
    ]),
  );

  /** Accessibility audit result. */
  const a11yResult: A11yAuditResult = auditAccessibility(a11yScanSources);

  /** Failing accessibility rules. */
  const a11yFailingRules: A11yRuleResult[] = a11yResult.rules.filter(
    (r: A11yRuleResult): boolean => r.status === 'fail',
  );

  /** Raw CSS/Svelte source files for browser support scanning. */
  const cssSourceModules: Record<Str, Str> = import.meta.glob(
    ['/src/app.css', '/../../shared/ui/src/**/*.{svelte,css}'],
    { query: '?raw', import: 'default', eager: true },
  ) as unknown as Record<Str, Str>;

  /** Filename-keyed source map for the browser scanner. */
  const browserScanSources: Record<Str, Str> = Object.fromEntries(
    Object.entries(cssSourceModules).map(([path, content]: [Str, unknown]): [Str, Str] => [
      (path.split('/').pop() ?? path) as Str,
      String(content) as Str,
    ]),
  );

  /** Browser support analysis result. */
  const browserResult: BrowserSupportResult = detectBrowserSupport(browserScanSources);

  /** Unsupported browser count. */
  const unsupportedBrowserCount: Num = browserResult.unsupported.length as Num;

  /* ------------------------------------------------------------------ */
  /*  Lens compatibility data from parent layout (via Svelte context)    */
  /* ------------------------------------------------------------------ */

  /** Lens compatibility results per component, set by +layout.svelte. */
  const compatByName: Map<Str, LensCompatibility> = getContext('lens-compat-by-name');

  /** Number of fully compliant components (all 18 rules pass). */
  const compliantCount: Num = componentNames.filter(
    (n: Str): boolean => compatByName.get(n)?.compatible === true,
  ).length as Num;

  /** Compliance percentage. */
  const compliantPercent: Num = (
    componentNames.length > 0 ? Math.round((compliantCount / componentNames.length) * 100) : 0
  ) as Num;

  /** Incompatible count. */
  const incompatibleCount: Num = (componentNames.length - (compliantCount as number)) as Num;

  /** Rule violation counts — how many components violate each rule. */
  const ruleViolationCounts: Array<{ rule: Num; name: Str; count: Num }> = LENS_RULE_NAMES.map(
    (name: Str, idx: Num): { rule: Num; name: Str; count: Num } => {
      const count: Num = componentNames.filter((n: Str): boolean => {
        const compat: LensCompatibility | undefined = compatByName.get(n);

        if (!compat) {
          return false;
        }
        return compat.violations.some((v) => v.rule === idx);
      }).length as Num;

      return { rule: idx, name, count };
    },
  )
    .filter((r): boolean => (r.count as number) > 0)
    .toSorted((a, b): number => (b.count as number) - (a.count as number));

  /* ------------------------------------------------------------------ */
  /*  Tags                                                               */
  /* ------------------------------------------------------------------ */

  /** All unique tags across all documented components, sorted alphabetically. */
  const allTags: Str[] = [
    ...new Set([...metaByName.values()].flatMap((m: LensMeta): Str[] => m.tags)),
  ].toSorted();

  /** Tag usage counts for popular tags display. */
  const tagCounts: Map<Str, Num> = new Map();

  for (const meta of metaByName.values()) {
    for (const tag of meta.tags) {
      tagCounts.set(tag, ((tagCounts.get(tag) ?? 0) + 1) as Num);
    }
  }

  /** Tag → component names mapping for tooltip display. */
  const tagComponents: Map<Str, Str[]> = new Map();

  for (const [name, meta] of metaByName.entries()) {
    for (const tag of meta.tags) {
      const existing: Str[] = tagComponents.get(tag) ?? [];
      existing.push(name);
      tagComponents.set(tag, existing);
    }
  }

  /** Top 20 tags sorted by usage count descending. */
  const popularTags: Array<{ tag: Str; count: Num }> = [...tagCounts.entries()]
    .map(([tag, count]: [Str, Num]): { tag: Str; count: Num } => ({ tag, count }))
    .toSorted((a, b): number => (b.count as number) - (a.count as number))
    .slice(0, 20);

  /** Max tag count for relative sizing. */
  const maxTagCount: Num = (popularTags.length > 0 ? (popularTags[0]?.count ?? 1) : 1) as Num;

  /* ------------------------------------------------------------------ */
  /*  Activity feed                                                      */
  /* ------------------------------------------------------------------ */

  /** Components with a status (new, updated, deprecated) for hub card count. */
  const activityEntries: Array<{ name: Str; meta: LensMeta }> = componentNames
    .filter((n: Str): boolean => {
      const m: LensMeta | undefined = metaByName.get(n);

      return m?.status !== undefined;
    })
    .map((n: Str): { name: Str; meta: LensMeta } => ({
      name: n,
      meta: metaByName.get(n) as LensMeta, // safe — filtered above
    }));

  /* ------------------------------------------------------------------ */
  /*  Icon count from layout data                                        */
  /* ------------------------------------------------------------------ */

  /** Icon count from layout server data. */
  // UI boundary — $derived must produce a value; fallback if data not loaded
  const iconCount: Num = $derived.by((): Num => {
    const count: unknown = $page.data?.iconCount;

    if (typeof count === 'number') {
      return count as Num;
    }
    log.warn('iconCount not available from layout data');
    return 0 as Num;
  });

  /* ------------------------------------------------------------------ */
  /*  Explore hub cards                                                   */
  /* ------------------------------------------------------------------ */

  /** Hub card definition for the explore grid. */
  type HubCard = {
    /** Page URL. */
    href: Str;
    /** Card title. */
    title: Str;
    /** Short description. */
    description: Str;
    /** Lucide icon component. */
    icon: Component;
    /** Icon/accent color class. */
    color: Str;
    /** Background color class. */
    bg: Str;
    /** Count to display. */
    count: Num;
    /** Count label. */
    countLabel: Str;
  };

  const hubCards: HubCard[] = [
    {
      href: '/getting-started' as Str,
      title: 'Getting Started' as Str,
      description: 'Installation, setup, and usage guide' as Str,
      icon: BookOpen,
      color: 'text-emerald-600 dark:text-emerald-400' as Str,
      bg: 'bg-emerald-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
    {
      href: '/components/all' as Str,
      title: 'All Components' as Str,
      description: 'Browse, search, and filter the full component library' as Str,
      icon: List,
      color: 'text-blue-600 dark:text-blue-400' as Str,
      bg: 'bg-blue-500/10' as Str,
      count: componentNames.length as Num,
      countLabel: 'components' as Str,
    },
    {
      href: '/components/category' as Str,
      title: 'Categories' as Str,
      description: 'Components organized by function and purpose' as Str,
      icon: LayoutGrid,
      color: 'text-violet-600 dark:text-violet-400' as Str,
      bg: 'bg-violet-500/10' as Str,
      count: groupedComponents.length as Num,
      countLabel: 'categories' as Str,
    },
    {
      href: '/components/tags' as Str,
      title: 'Tags' as Str,
      description: 'Cross-cutting labels for component discovery' as Str,
      icon: TagIcon,
      color: 'text-amber-600 dark:text-amber-400' as Str,
      bg: 'bg-amber-500/10' as Str,
      count: allTags.length as Num,
      countLabel: 'tags' as Str,
    },
    {
      href: '/tokens' as Str,
      title: 'Design Tokens' as Str,
      description: 'CSS custom properties and theme variables' as Str,
      icon: Palette,
      color: 'text-pink-600 dark:text-pink-400' as Str,
      bg: 'bg-pink-500/10' as Str,
      count: tokenCount,
      countLabel: 'tokens' as Str,
    },
    {
      href: '/icons' as Str,
      title: 'Icons' as Str,
      description: 'Lucide icon browser with preview and export' as Str,
      icon: Shapes,
      color: 'text-teal-600 dark:text-teal-400' as Str,
      bg: 'bg-teal-500/10' as Str,
      count: iconCount,
      countLabel: 'icons' as Str,
    },
    {
      href: '/styling' as Str,
      title: 'Styling' as Str,
      description: 'Theme system, dark mode, colors, typography, and customization' as Str,
      icon: PaintbrushIcon,
      color: 'text-fuchsia-600 dark:text-fuchsia-400' as Str,
      bg: 'bg-fuchsia-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
    {
      href: '/changelog' as Str,
      title: "What's New" as Str,
      description: 'Latest changes, additions, and deprecations' as Str,
      icon: Newspaper,
      color: 'text-orange-600 dark:text-orange-400' as Str,
      bg: 'bg-orange-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
    {
      href: '/accessibility' as Str,
      title: 'Accessibility' as Str,
      description: 'WCAG compliance, keyboard navigation, and screen reader support' as Str,
      icon: AccessibilityIcon,
      color: 'text-indigo-600 dark:text-indigo-400' as Str,
      bg: 'bg-indigo-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
    {
      href: '/browser-support' as Str,
      title: 'Browser Support' as Str,
      description: 'Supported browsers, CSS features, and framework compatibility' as Str,
      icon: Monitor,
      color: 'text-cyan-600 dark:text-cyan-400' as Str,
      bg: 'bg-cyan-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
    {
      href: '/about' as Str,
      title: 'About' as Str,
      description: 'Project mission, tech stack, and release information' as Str,
      icon: Info,
      color: 'text-sky-600 dark:text-sky-400' as Str,
      bg: 'bg-sky-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
    {
      href: '/support' as Str,
      title: 'Support' as Str,
      description: 'Help resources, bug reporting, FAQ, and community' as Str,
      icon: LifeBuoy,
      color: 'text-lime-600 dark:text-lime-400' as Str,
      bg: 'bg-lime-500/10' as Str,
      count: 0 as Num,
      countLabel: '' as Str,
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Health section collapse state                                      */
  /* ------------------------------------------------------------------ */

  /** Whether the health details section is expanded. */
  let healthExpanded: boolean = $state(false);

  /** Section collapse state — all open by default. */
  let exploreOpen: boolean = $state(true);
  let categoriesOpen: boolean = $state(true);
  let tagsOpen: boolean = $state(true);
</script>

<div class="w-full">
  <!-- Sticky header -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <LayoutGrid class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Overview</h1>
        <p class="text-sm text-muted-foreground">Component library dashboard</p>
      </div>
    </div>
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
    <!-- Health & Quality -->
    <div class="rounded-lg border bg-card">
      <div class="flex items-center gap-3 p-4">
        <ShieldCheck
          class="size-5 shrink-0 {compliantPercent >= 80
            ? 'text-emerald-600 dark:text-emerald-400'
            : compliantPercent >= 50
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400'}"
        />
        <div class="flex-1">
          <div class="flex items-baseline gap-2">
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: compatLabelTip }: { props: Record<string, unknown> })}
                  <span
                    class="cursor-help text-sm font-semibold underline decoration-dotted underline-offset-4"
                    {...compatLabelTip}
                  >
                    Compatibility
                  </span>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content sideOffset={4} class="max-w-72">
                <p class="text-xs">
                  Combined health score from Lens rules (R0–R17), accessibility audit (WCAG/ARIA),
                  and browser support analysis.
                </p>
              </Tooltip.Content>
            </Tooltip.Root>
            <span
              class="text-sm font-bold tabular-nums {compliantPercent >= 80
                ? 'text-emerald-600 dark:text-emerald-400'
                : compliantPercent >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'}"
            >
              {compliantPercent}%
            </span>
            <span class="text-xs text-muted-foreground">
              ({compliantCount}/{componentNames.length} passing)
            </span>
          </div>
          <!-- Summary counts -->
          <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>
              <ShieldCheck class="mr-0.5 inline size-3" />
              {ruleViolationCounts.length} Lens rule{ruleViolationCounts.length !== 1 ? 's' : ''} failing
            </span>
            <span>
              <AccessibilityIcon class="mr-0.5 inline size-3" />
              {a11yFailingRules.length} accessibility rule{a11yFailingRules.length !== 1 ? 's' : ''} failing
            </span>
            <span>
              <Globe class="mr-0.5 inline size-3" />
              {unsupportedBrowserCount} unsupported browser{(unsupportedBrowserCount as number) !==
              1
                ? 's'
                : ''}
            </span>
          </div>
          <!-- Progress bar -->
          <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all {compliantPercent >= 80
                ? 'bg-emerald-500'
                : compliantPercent >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'}"
              style="width: {compliantPercent}%;"
            ></div>
          </div>
        </div>
        <button
          type="button"
          class="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onclick={() => {
            healthExpanded = !healthExpanded;
          }}
          aria-label={healthExpanded ? 'Hide details' : 'Show details'}
        >
          <ArrowRight
            class="size-4 transition-transform duration-200 {healthExpanded ? 'rotate-90' : ''}"
          />
        </button>
      </div>

      {#if healthExpanded}
        <div class="border-t px-4 py-3">
          <!-- Lens Rule Violations -->
          {#if ruleViolationCounts.length > 0}
            <div class="mb-4">
              <div class="mb-2 flex items-center gap-2">
                <ShieldCheck class="size-3.5 text-amber-500" />
                <span class="text-xs font-medium text-muted-foreground">
                  Lens Rule Violations ({incompatibleCount as number} components affected)
                </span>
              </div>
              <div class="overflow-hidden rounded-lg border bg-card">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b bg-muted/50">
                      <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Rule</th>
                      <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Name</th>
                      <th class="px-3 py-1.5 text-right font-medium text-muted-foreground"
                        >Affected</th
                      >
                    </tr>
                  </thead>
                  <tbody>
                    {#each ruleViolationCounts as rv (rv.rule)}
                      <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                        <td class="px-3 py-1.5 text-muted-foreground">
                          <span class="inline-flex items-center gap-1.5">
                            <span
                              class="inline-flex whitespace-nowrap rounded bg-blue-500/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-blue-600 dark:text-blue-400"
                              >Lens</span
                            >
                            <span class="font-mono">R{rv.rule}</span>
                          </span>
                        </td>
                        <td class="px-3 py-1.5">{rv.name}</td>
                        <td class="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {rv.count} component{(rv.count as number) !== 1 ? 's' : ''}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}

          <!-- Accessibility Violations -->
          {#if a11yFailingRules.length > 0}
            <div class="mb-4">
              <div class="mb-2 flex items-center gap-2">
                <AccessibilityIcon class="size-3.5 text-amber-500" />
                <a
                  href="/accessibility"
                  class="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Accessibility Violations ({a11yFailingRules.length} rules failing) →
                </a>
              </div>
              <div class="overflow-hidden rounded-lg border bg-card">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b bg-muted/50">
                      <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Rule</th>
                      <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Name</th>
                      <th class="px-3 py-1.5 text-right font-medium text-muted-foreground"
                        >Failures</th
                      >
                    </tr>
                  </thead>
                  <tbody>
                    {#each a11yFailingRules.toSorted((a, b) => (b.failCount as number) - (a.failCount as number)) as rule (rule.id)}
                      <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                        <td class="px-3 py-1.5 text-muted-foreground">
                          <span class="inline-flex items-center gap-1.5">
                            <span
                              class="inline-flex whitespace-nowrap rounded bg-purple-500/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-purple-600 dark:text-purple-400"
                              >{rule.standard}</span
                            >
                            <span class="font-mono">{rule.wcag}</span>
                          </span>
                        </td>
                        <td class="px-3 py-1.5">{rule.label}</td>
                        <td class="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                          {rule.failCount} failure{(rule.failCount as number) !== 1 ? 's' : ''}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}

          <!-- Browser Support Issues -->
          {#if (unsupportedBrowserCount as number) > 0}
            <div>
              <div class="mb-2 flex items-center gap-2">
                <Globe class="size-3.5 text-amber-500" />
                <a
                  href="/browser-support"
                  class="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Unsupported Browsers ({unsupportedBrowserCount}) →
                </a>
              </div>
              <div class="overflow-hidden rounded-lg border bg-card">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b bg-muted/50">
                      <th class="px-3 py-1.5 text-left font-medium text-muted-foreground"
                        >Browser</th
                      >
                      <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Notes</th>
                      <th class="px-3 py-1.5 text-right font-medium text-muted-foreground"
                        >Limiting Feature</th
                      >
                    </tr>
                  </thead>
                  <tbody>
                    {#each browserResult.unsupported as browser (browser.name)}
                      <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                        <td class="px-3 py-1.5 font-medium">{browser.name}</td>
                        <td class="px-3 py-1.5 text-muted-foreground">{browser.notes}</td>
                        <td class="px-3 py-1.5 text-right text-muted-foreground">
                          {browser.limitingFeature}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}

          <!-- All clear message -->
          {#if ruleViolationCounts.length === 0 && a11yFailingRules.length === 0 && (unsupportedBrowserCount as number) === 0}
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <CircleCheck class="size-3.5 text-emerald-500" />
              <span>All checks passing — no violations found</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Explore Hub Grid -->
    <div>
      <button
        type="button"
        onclick={() => {
          exploreOpen = !exploreOpen;
        }}
        class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
      >
        <ChevronRight
          class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {exploreOpen
            ? 'rotate-90'
            : ''}"
        />
        <Shapes class="size-5" />
        Explore
      </button>
      {#if exploreOpen}
        <div transition:slide={{ duration: 200 }}>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {#each hubCards as card (card.href)}
              {@const CardIcon = card.icon}
              <a
                href={card.href}
                class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div class="flex size-10 shrink-0 items-center justify-center rounded-lg {card.bg}">
                  <CardIcon class="size-5 {card.color}" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-semibold group-hover:text-primary">{card.title}</h3>
                    {#if (card.count as number) > 0}
                      <Tooltip.Provider disableHoverableContent={false}>
                        <Tooltip.Root delayDuration={300}>
                          <Tooltip.Trigger>
                            {#snippet child({
                              props: hubBadgeTip,
                            }: {
                              props: Record<string, unknown>;
                            })}
                              <span
                                class="inline-flex"
                                onclick={(e) => e.preventDefault()}
                                {...hubBadgeTip}
                              >
                                <Badge
                                  variant="secondary"
                                  class="cursor-default text-[10px] tabular-nums"
                                >
                                  {card.count.toLocaleString()}
                                </Badge>
                              </span>
                            {/snippet}
                          </Tooltip.Trigger>
                          <Tooltip.Content
                            side="bottom"
                            sideOffset={4}
                            class="max-h-64 overflow-y-auto p-3"
                          >
                            {#if card.href === '/components/all'}
                              <div class="flex flex-col gap-0.5">
                                {#each componentNames as comp (comp)}
                                  <a
                                    href="/components/{comp}"
                                    class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-popover-foreground/80 transition-colors hover:bg-popover-foreground/10 hover:text-popover-foreground"
                                    onclick={(e) => e.stopPropagation()}
                                  >
                                    <ComponentIcon class="size-3 shrink-0 opacity-50" />
                                    <span class="flex-1">{toTitle(comp)}</span>
                                    <ArrowRight class="size-3 shrink-0 opacity-40" />
                                  </a>
                                {/each}
                              </div>
                            {:else if card.href === '/components/category'}
                              <div class="flex flex-col gap-0.5">
                                {#each groupedComponents as group (group.name)}
                                  {@const GrpIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
                                  {@const grpColor =
                                    CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
                                  <a
                                    href="/components/category/{group.name}"
                                    class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-popover-foreground/80 transition-colors hover:bg-popover-foreground/10 hover:text-popover-foreground"
                                    onclick={(e) => e.stopPropagation()}
                                  >
                                    <GrpIcon class="size-3 shrink-0 {grpColor}" />
                                    <span class="flex-1 capitalize">{group.label}</span>
                                    <span class="tabular-nums opacity-60"
                                      >{group.components.length}</span
                                    >
                                  </a>
                                {/each}
                              </div>
                            {:else if card.href === '/components/tags'}
                              <div class="flex flex-col gap-0.5">
                                {#each popularTags as pt (pt.tag)}
                                  <a
                                    href="/components/tags?tag={pt.tag}"
                                    class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-popover-foreground/80 transition-colors hover:bg-popover-foreground/10 hover:text-popover-foreground"
                                    onclick={(e) => e.stopPropagation()}
                                  >
                                    <TagIcon class="size-3 shrink-0 opacity-50" />
                                    <span class="flex-1">{pt.tag}</span>
                                    <span class="tabular-nums opacity-60">{pt.count}</span>
                                  </a>
                                {/each}
                              </div>
                            {:else if card.href === '/tokens'}
                              <p class="text-xs text-popover-foreground/80">
                                {card.count} CSS custom properties across all themes
                              </p>
                            {:else}
                              <p class="text-xs text-popover-foreground/80">
                                {card.count.toLocaleString()}
                                {card.countLabel}
                              </p>
                            {/if}
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    {/if}
                  </div>
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">{card.description}</p>
                </div>
                <ArrowRight
                  class="size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Categories at a Glance -->
    <div>
      <button
        type="button"
        onclick={() => {
          categoriesOpen = !categoriesOpen;
        }}
        class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
      >
        <ChevronRight
          class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {categoriesOpen
            ? 'rotate-90'
            : ''}"
        />
        <LayoutGrid class="size-5" />
        Categories
        <Badge variant="secondary" class="text-xs">{groupedComponents.length}</Badge>
      </button>
      {#if categoriesOpen}
        <div transition:slide={{ duration: 200 }}>
          <div class="flex flex-wrap gap-2">
            {#each groupedComponents as group (group.name)}
              {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
              {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
              {@const catBg = CATEGORY_BG[group.name] ?? ('bg-muted' as Str)}
              <a
                href="/components/category/{group.name}"
                class="group inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div class="flex size-6 items-center justify-center rounded {catBg}">
                  <CatIcon class="size-3.5 {catColor}" />
                </div>
                <span class="font-medium capitalize group-hover:text-primary">{group.label}</span>
                <Tooltip.Provider disableHoverableContent={false}>
                  <Tooltip.Root delayDuration={300}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: catCountTip }: { props: Record<string, unknown> })}
                        <span
                          class="inline-flex"
                          onclick={(e) => e.preventDefault()}
                          {...catCountTip}
                        >
                          <Badge
                            variant="secondary"
                            class="cursor-default text-[10px] tabular-nums"
                          >
                            {group.components.length}
                          </Badge>
                        </span>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content
                      side="bottom"
                      sideOffset={4}
                      class="max-h-64 overflow-y-auto p-3"
                    >
                      <div class="flex flex-col gap-0.5">
                        {#each group.components as comp (comp)}
                          <a
                            href="/components/{comp}"
                            class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-popover-foreground/80 transition-colors hover:bg-popover-foreground/10 hover:text-popover-foreground"
                            onclick={(e) => e.stopPropagation()}
                          >
                            <ComponentIcon class="size-3 shrink-0 opacity-50" />
                            <span class="flex-1">{toTitle(comp)}</span>
                            <ArrowRight class="size-3 shrink-0 opacity-40" />
                          </a>
                        {/each}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Tooltip.Provider>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Popular Tags -->
    {#if popularTags.length > 0}
      <div>
        <button
          type="button"
          onclick={() => {
            tagsOpen = !tagsOpen;
          }}
          class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold transition-colors hover:text-foreground/80"
        >
          <ChevronRight
            class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 {tagsOpen
              ? 'rotate-90'
              : ''}"
          />
          <TagIcon class="size-5" />
          Popular Tags
          <Badge variant="secondary" class="text-xs">{popularTags.length}</Badge>
        </button>
        {#if tagsOpen}
          <div transition:slide={{ duration: 200 }}>
            <div class="flex flex-wrap gap-1.5">
              {#each popularTags as pt (pt.tag)}
                {@const relSize = 0.7 + 0.5 * ((pt.count as number) / (maxTagCount as number))}
                <a
                  href="/components/tags?tag={pt.tag}"
                  class="group inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 transition-all hover:border-primary/30 hover:bg-accent"
                  style="font-size: {relSize}rem;"
                >
                  <TagIcon class="size-3 shrink-0 opacity-50 group-hover:opacity-80" />
                  <span class="font-medium group-hover:text-primary">{pt.tag}</span>
                  <Tooltip.Provider disableHoverableContent={false}>
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tagCountTip }: { props: Record<string, unknown> })}
                          <span
                            class="cursor-default text-[10px] tabular-nums text-muted-foreground/60"
                            onclick={(e) => e.preventDefault()}
                            {...tagCountTip}
                          >
                            {pt.count}
                          </span>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="bottom"
                        sideOffset={4}
                        class="max-h-64 overflow-y-auto p-3"
                      >
                        {@const comps = tagComponents.get(pt.tag) ?? []}
                        <div class="flex flex-col gap-0.5">
                          {#each comps as comp (comp)}
                            <a
                              href="/components/{comp}"
                              class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-popover-foreground/80 transition-colors hover:bg-popover-foreground/10 hover:text-popover-foreground"
                              onclick={(e) => e.stopPropagation()}
                            >
                              <ComponentIcon class="size-3 shrink-0 opacity-50" />
                              <span class="flex-1">{toTitle(comp)}</span>
                              <ArrowRight class="size-3 shrink-0 opacity-40" />
                            </a>
                          {/each}
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
