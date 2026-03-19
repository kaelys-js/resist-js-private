<script lang="ts">
  /**
   * Layout for the `(testing)` route group.
   *
   * Sits under the minimal root layout (CSS only) — the editor's app
   * shell (sidebar, header, resizable panes) lives in `(app)/+layout.svelte`.
   * Provides its own sidebar + breadcrumb chrome for the Lens documentation system.
   */
  import { ModeWatcher, mode as derivedMode, setMode as rawSetMode } from 'mode-watcher';
  import { page } from '$app/state';
  import { storageKey } from '$lib/config/app-meta';
  import type { Num, Str, Void } from '@/schemas/common';
  import type { LensMeta, CategoryGroup, LensExample, LensStatus } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    findPrimaryKey,
    extractComponentDescription,
    computeLensCompatibility,
    type LensCompatibility,
  } from '@/ui/lens/lens-utils.js';
  import { extractProps } from '@/ui/lens/extract-props.js';
  import { extractVariants } from '@/ui/lens/extract-variants.js';
  import { extractDeps, type DepTree } from '@/ui/lens/extract-deps.js';
  import { log } from '@/utils/core/logger';
  import * as Sidebar from '@/ui/sidebar/index.js';
  import * as Breadcrumb from '@/ui/breadcrumb/index.js';
  import * as Collapsible from '@/ui/collapsible/index.js';
  import CommandSearch from '@/ui/command-search/CommandSearch.svelte';
  import SidebarToggle from '@/ui/sidebar-toggle/SidebarToggle.svelte';
  import ModeToggle from '@/ui/mode-toggle/ModeToggle.svelte';
  import Kbd from '@/ui/kbd/Kbd.svelte';
  import AppLogo from '@/ui/app-logo/AppLogo.svelte';
  import Badge from '@/ui/badge/badge.svelte';
  import { extractTokens, type ThemeTokenSet } from '@/ui/lens/extract-tokens.js';
  import {
    auditAccessibility,
    type A11yRuleResult,
    type A11yAuditResult,
  } from '@/ui/lens/detect-accessibility.js';
  import {
    detectBrowserSupport,
    type BrowserSupportResult,
  } from '@/ui/lens/detect-browser-support.js';
  import { fade, slide } from 'svelte/transition';
  import { setContext, untrack, type Component } from 'svelte';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Palette from '@lucide/svelte/icons/palette';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Newspaper from '@lucide/svelte/icons/newspaper';
  import Shapes from '@lucide/svelte/icons/shapes';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
  import Download from '@lucide/svelte/icons/download';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import Check from '@lucide/svelte/icons/check';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Clipboard from '@lucide/svelte/icons/clipboard';
  import Filter from '@lucide/svelte/icons/filter';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Home from '@lucide/svelte/icons/home';
  import Star from '@lucide/svelte/icons/star';
  import Clock from '@lucide/svelte/icons/clock';
  import StarOff from '@lucide/svelte/icons/star-off';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import XIcon from '@lucide/svelte/icons/x';
  import Bell from '@lucide/svelte/icons/bell';
  import BellOff from '@lucide/svelte/icons/bell-off';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import Info from '@lucide/svelte/icons/info';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import Tag from '@lucide/svelte/icons/tag';
  import Monitor from '@lucide/svelte/icons/monitor';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import PaintbrushIcon from '@lucide/svelte/icons/paintbrush';
  import AccessibilityIcon from '@lucide/svelte/icons/accessibility';
  import {
    CATEGORY_ORDER,
    CATEGORY_ICONS,
    CATEGORY_COLORS,
    CATEGORY_DESCRIPTIONS,
    LENS_RULE_NAMES,
    categoryLabel as catLabel,
  } from '$lib/config/lens-categories';
  import * as Popover from '@/ui/popover/index.js';
  import CompatRuleList from '@/ui/lens/CompatRuleList.svelte';
  import { cn } from '@/ui/utils.js';
  import { Toaster, toast } from 'svelte-sonner';
  import {
    loadNotifications,
    pushNotification,
    pushNotificationBatch,
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    removeNotification,
    clearAllNotifications,
    getPreferences,
    updatePreferences,
    isTypeEnabled,
    type LensNotification,
    type NotificationType,
    type NotificationPreferences,
  } from '$lib/stores/lens-notifications.svelte.js';

  const { children, data } = $props();

  /**
   * Discover all component directories by globbing all .svelte files.
   * We extract unique directory names as the component listing.
   */
  const allModules: Record<Str, unknown> = import.meta.glob('@/ui/*/*.svelte');

  /**
   * Eagerly load lens.ts metadata for category grouping and search keywords.
   */
  const lensMetaModules: Record<
    Str,
    { meta?: LensMeta; default?: LensExample[]; examples?: LensExample[] }
  > = import.meta.glob('@/ui/*/lens.ts', { import: '*', eager: true }) as Record<
    Str,
    { meta?: LensMeta; default?: LensExample[]; examples?: LensExample[] }
  >;

  /**
   * Raw .svelte sources for prop/variant extraction (global search).
   * Eager to avoid MIME type issues with Vite 7 + Svelte plugin.
   */
  const rawSources: Record<Str, Str> = import.meta.glob('@/ui/*/*.svelte', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /**
   * Raw .ts sources for cross-file type resolution in prop extraction.
   */
  const rawTsSources: Record<Str, Str> = import.meta.glob('@/ui/*/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /**
   * Raw docs.md files for custom component documentation.
   */
  const docsModules: Record<Str, Str> = import.meta.glob('@/ui/*/docs.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /**
   * Raw app.css for design token extraction.
   */
  const cssRawModules: Record<Str, Str> = import.meta.glob('/src/app.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  const componentNames: Str[] = [...new Set(Object.keys(allModules).map(extractDir))]
    .filter((n: Str): boolean => n.length > 0)
    .toSorted();

  /**
   * Build a metadata lookup by component name from lens.ts glob results.
   * Each meta is validated against LensMetaSchema via the Result pattern.
   * Invalid metadata surfaces as a visible error in the sidebar.
   */
  const metaByName: Map<Str, LensMeta> = new Map();
  const metaErrors: Map<Str, Str> = new Map();
  const examplesByName: Map<Str, LensExample[]> = new Map();
  for (const [key, mod] of Object.entries(lensMetaModules)) {
    const dir: Str = extractDir(key);
    if (mod.meta) {
      const result: Result<LensMeta> = parseLensMeta(mod.meta);
      if (result.ok) {
        // Spread to unfreeze — Result.data is deep-frozen but Map<Str, LensMeta> needs mutable shape
        metaByName.set(dir, {
          ...result.data,
          tags: [...result.data.tags],
          breakingChanges: result.data.breakingChanges?.map((bc) => ({ ...bc })),
        });
      } else {
        // UI boundary — sidebar must render; error stored for visible indicator
        log.warn(`Invalid lens.ts for "${dir}": ${result.error.message}`);
        metaErrors.set(dir, result.error.message);
      }
    }
    const examples: unknown = mod.default ?? mod.examples;
    if (Array.isArray(examples) && examples.length > 0) {
      examplesByName.set(dir, examples as LensExample[]);
    }
  }

  /**
   * Group component names by category for sidebar rendering.
   * Components without metadata default to 'display'.
   */
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

  /**
   * Raw example .svelte file paths for compatibility checking (rule 16).
   * Used to verify declared example names match actual filesystem files.
   */
  const exampleSvelteModules: Record<Str, unknown> = import.meta.glob('@/ui/*/examples/*.svelte');

  /**
   * Build global search items with hierarchical grouping.
   *
   * Each component gets multiple groups using " › " as a hierarchy separator:
   *   Component Name          → "Go to Component" link
   *   Component › Props       → individual prop items
   *   Component › Variants    → individual variant items
   *   Component › Examples    → individual example items
   *   Component › Dependencies › UI Components / Workspace / External
   *
   * cmdk automatically hides groups with no matching items during search.
   */
  const tsSources: Str[] = Object.values(rawTsSources);
  const globalSearchItems: SearchItem[] = [];

  /**
   * Lens compatibility results per component, computed alongside search indexing.
   * Keyed by component directory name. Used for sidebar indicators and detail page banners.
   */
  const compatByName: Map<Str, LensCompatibility> = new Map();

  for (const n of componentNames) {
    const m: LensMeta | undefined = metaByName.get(n);
    const title: Str = toTitle(n);
    const baseHref: Str = `/components/${n}`;

    // Component-level keywords (tags, category, descriptions)
    const componentKeywords: Str[] = [
      ...(m?.tags ?? []),
      m?.category ?? '',
      m?.description ?? '',
    ].filter((k: Str): boolean => k.length > 0);

    // — Component group: "Go to Component" link —
    const sourceKey: Str | undefined = findPrimaryKey(n, rawSources);
    if (sourceKey) {
      const src: Str = rawSources[sourceKey] ?? '';
      const jsdocDesc: Str | undefined = extractComponentDescription(src);
      if (jsdocDesc) componentKeywords.push(jsdocDesc);
    }
    globalSearchItems.push({
      value: n,
      label: `Go to ${title}`,
      href: baseHref,
      group: title,
      keywords: componentKeywords,
    });

    if (sourceKey) {
      const src: Str = rawSources[sourceKey] ?? '';
      const componentProps = extractProps(src, tsSources.length > 0 ? tsSources : undefined);
      const variants = extractVariants(src);
      const deps: DepTree = extractDeps(src);

      // — Lens compatibility check —
      const compHasLensTs: boolean = Object.keys(lensMetaModules).some(
        (k: Str): boolean => extractDir(k) === n,
      );
      const compExamples: LensExample[] | undefined = examplesByName.get(n);
      const compDeclaredNames: Str[] = (compExamples ?? []).map((ex: LensExample): Str => ex.name);
      const compExistingFiles: Str[] = Object.keys(exampleSvelteModules)
        .filter((k: Str): boolean => k.includes(`/${n}/examples/`))
        .map((k: Str): Str => {
          const parts: Str[] = k.split('/');
          return parts.at(-1) ?? '';
        });
      const compUsesTv: boolean = /\btv\s*\(\s*\{/.test(src);
      compatByName.set(
        n,
        computeLensCompatibility({
          dir: n,
          source: src,
          hasLensTs: compHasLensTs,
          meta: m ?? null,
          hasPrimary: true,
          props: componentProps,
          hasVariants: variants !== null && variants.variants.length > 0,
          hasExamples: (compExamples?.length ?? 0) > 0,
          usesTv: compUsesTv,
          declaredExampleNames: compDeclaredNames,
          existingExampleFiles: compExistingFiles,
        }),
      );

      // — Props group —
      const propsGroup: Str = `${title} › Props`;
      if (componentProps.length > 0) {
        for (const prop of componentProps) {
          const propKeywords: Str[] = [n];
          if (prop.type) propKeywords.push(prop.type);
          if (prop.description) propKeywords.push(prop.description);
          globalSearchItems.push({
            value: `${n}/prop/${prop.name}`,
            label: prop.name,
            href: `${baseHref}#prop-${prop.name}`,
            group: propsGroup,
            keywords: propKeywords,
          });
        }
      } else {
        globalSearchItems.push({
          value: `${n}/props/empty`,
          label: 'No props',
          group: propsGroup,
          keywords: [n],
        });
      }

      // — Variants group —
      const variantsGroup: Str = `${title} › Variants`;
      if (variants && variants.variants.length > 0) {
        for (const vk of variants.variants) {
          globalSearchItems.push({
            value: `${n}/variant/${vk.key}`,
            label: vk.key,
            href: `${baseHref}#variant-${vk.key}`,
            group: variantsGroup,
            keywords: [n, ...vk.options],
          });
        }
      } else {
        globalSearchItems.push({
          value: `${n}/variants/empty`,
          label: 'No variants',
          group: variantsGroup,
          keywords: [n],
        });
      }

      // — Examples group —
      const examplesGroup: Str = `${title} › Examples`;
      const examples: LensExample[] | undefined = examplesByName.get(n);
      if (examples && examples.length > 0) {
        for (const ex of examples) {
          const exKeywords: Str[] = [n, ex.name];
          if (ex.description) exKeywords.push(ex.description);
          globalSearchItems.push({
            value: `${n}/example/${ex.name}`,
            label: ex.title,
            href: `${baseHref}#example-${ex.name}`,
            group: examplesGroup,
            keywords: exKeywords,
          });
        }
      } else {
        globalSearchItems.push({
          value: `${n}/examples/empty`,
          label: 'No examples',
          group: examplesGroup,
          keywords: [n],
        });
      }

      // — Dependencies groups (sub-categorized) —
      const hasDeps: boolean =
        deps.internal.length > 0 || deps.workspace.length > 0 || deps.external.length > 0;
      if (hasDeps) {
        globalSearchItems.push({
          value: `${n}/deps/header`,
          label: `Go to dependencies`,
          href: `${baseHref}#dependencies`,
          group: `${title} › Dependencies`,
          keywords: [n],
        });
      }
      const seenInternal: Set<Str> = new Set();
      if (deps.internal.length > 0) {
        for (const dep of deps.internal) {
          if (seenInternal.has(dep.component)) continue;
          seenInternal.add(dep.component);
          globalSearchItems.push({
            value: `${n}/dep/internal/${dep.component}`,
            label: toTitle(dep.component),
            href: `${baseHref}#dependencies`,
            group: `${title} › Dependencies › UI Components`,
            keywords: [n, ...dep.names],
          });
        }
      }
      const seenWorkspace: Set<Str> = new Set();
      if (deps.workspace.length > 0) {
        for (const dep of deps.workspace) {
          if (seenWorkspace.has(dep.path)) continue;
          seenWorkspace.add(dep.path);
          globalSearchItems.push({
            value: `${n}/dep/workspace/${dep.path}`,
            label: dep.path,
            href: `${baseHref}#dependencies`,
            group: `${title} › Dependencies › Workspace`,
            keywords: [n, ...dep.names],
          });
        }
      }
      const seenExternal: Set<Str> = new Set();
      if (deps.external.length > 0) {
        for (const dep of deps.external) {
          if (seenExternal.has(dep.path)) continue;
          seenExternal.add(dep.path);
          globalSearchItems.push({
            value: `${n}/dep/external/${dep.path}`,
            label: dep.path,
            href: `${baseHref}#dependencies`,
            group: `${title} › Dependencies › External`,
            keywords: [n, ...dep.names],
          });
        }
      }
      if (deps.internal.length === 0 && deps.workspace.length === 0 && deps.external.length === 0) {
        globalSearchItems.push({
          value: `${n}/deps/empty`,
          label: 'No dependencies',
          group: `${title} › Dependencies`,
          keywords: [n],
        });
      }
    } else {
      // No source found — show empty sections
      globalSearchItems.push(
        { value: `${n}/props/empty`, label: 'No props', group: `${title} › Props`, keywords: [n] },
        {
          value: `${n}/variants/empty`,
          label: 'No variants',
          group: `${title} › Variants`,
          keywords: [n],
        },
        {
          value: `${n}/examples/empty`,
          label: 'No examples',
          group: `${title} › Examples`,
          keywords: [n],
        },
        {
          value: `${n}/deps/empty`,
          label: 'No dependencies',
          group: `${title} › Dependencies`,
          keywords: [n],
        },
      );

      // No primary source — compute compatibility with hasPrimary=false
      if (!compatByName.has(n)) {
        const hasLensTs: boolean = Object.keys(lensMetaModules).some(
          (k: Str): boolean => extractDir(k) === n,
        );
        compatByName.set(
          n,
          computeLensCompatibility({
            dir: n,
            source: '' as Str,
            hasLensTs,
            meta: m ?? null,
            hasPrimary: false,
            props: [],
            hasVariants: false,
            hasExamples: (examplesByName.get(n)?.length ?? 0) > 0,
            usesTv: false,
            declaredExampleNames: [],
            existingExampleFiles: [],
          }),
        );
      }
    }

    // — Documentation group (from docs.md) —
    const docsKey: Str | undefined = Object.keys(docsModules).find(
      (k: Str): boolean => extractDir(k) === n,
    );
    if (docsKey) {
      globalSearchItems.push({
        value: `${n}/docs`,
        label: 'Documentation',
        href: `${baseHref}#docs`,
        group: `${title} › Documentation`,
        keywords: [n, 'docs', 'documentation', 'guide'],
      });
    }

    // — Changelog group —
    globalSearchItems.push({
      value: `${n}/changelog`,
      label: 'Changelog',
      href: `${baseHref}#changelog`,
      group: `${title} › Changelog`,
      keywords: [n, 'changelog', 'history', 'git', 'commits'],
    });
  }

  // — Category search items —
  for (const group of groupedComponents) {
    globalSearchItems.push({
      value: `category/${group.name}`,
      label: `${group.label} — ${group.components.length} components`,
      href: `/components/category/${group.name}`,
      group: 'Categories',
      keywords: ['category', group.name, group.label],
    });
  }

  // — Tag search items —
  const allUniqueTags: Str[] = [
    ...new Set([...metaByName.values()].flatMap((m: LensMeta): Str[] => m.tags)),
  ].toSorted();
  for (const tag of allUniqueTags) {
    const tagCount: Num = [...metaByName.values()].filter((m: LensMeta): boolean =>
      m.tags.includes(tag),
    ).length as Num;
    globalSearchItems.push({
      value: `tag/${tag}`,
      label: `${tag} — ${tagCount} component${tagCount === 1 ? '' : 's'}`,
      href: `/components?tag=${tag}`,
      group: 'Tags',
      keywords: ['tag', tag],
    });
  }

  // — Accessibility audit (global) —
  const a11ySourceModules: Record<Str, Str> = import.meta.glob(
    ['/src/**/*.{svelte,css}', '/../../../shared/ui/src/**/*.{svelte,css,ts}'],
    { query: '?raw', import: 'default', eager: true },
  ) as unknown as Record<Str, Str>;

  /**
   * Convert glob path to workspace-relative path.
   *
   * @param globPath - Path from import.meta.glob
   * @returns Workspace-relative path
   */
  function toWorkspacePath(globPath: Str): Str {
    const s: string = globPath as string;
    const sharedIdx: number = s.indexOf('/shared/');
    if (sharedIdx >= 0) return s.slice(sharedIdx + 1) as Str;
    return `editor${s}` as Str;
  }

  /** Accessibility audit result (global). */
  const a11yResult: A11yAuditResult = auditAccessibility(
    Object.fromEntries(
      Object.entries(a11ySourceModules).map(([path, content]: [Str, unknown]): [Str, Str] => [
        toWorkspacePath(path as Str),
        String(content) as Str,
      ]),
    ),
  );

  /** Failing accessibility rules (global). */
  const a11yFailingRules: A11yRuleResult[] = a11yResult.rules.filter(
    (r: A11yRuleResult): boolean => r.status === 'fail',
  );

  // — Browser support analysis (global) —
  const browserCssModules: Record<Str, Str> = import.meta.glob(
    ['/src/app.css', '/../../shared/ui/src/**/*.{svelte,css}'],
    { query: '?raw', import: 'default', eager: true },
  ) as unknown as Record<Str, Str>;

  /** Browser support result (global). */
  const browserResult: BrowserSupportResult = detectBrowserSupport(
    Object.fromEntries(
      Object.entries(browserCssModules).map(([path, content]: [Str, unknown]): [Str, Str] => [
        (path.split('/').pop() ?? path) as Str,
        String(content) as Str,
      ]),
    ),
  );

  // — Share compatibility data with child pages via Svelte context —
  setContext('lens-compat-by-name', compatByName);
  setContext('lens-rule-names', LENS_RULE_NAMES);
  setContext('lens-a11y-failures', a11yFailingRules);
  setContext('lens-unsupported-browsers', browserResult.unsupported);

  // — Design Tokens search items —
  const cssRawSource: Str = Object.values(cssRawModules)[0] ?? '';
  if (cssRawSource) {
    const tokenSets: ThemeTokenSet[] = extractTokens(cssRawSource);
    const rootSet: ThemeTokenSet | undefined = tokenSets.find(
      (s: ThemeTokenSet): boolean => s.selector === ':root',
    );
    if (rootSet) {
      globalSearchItems.push({
        value: 'tokens/overview',
        label: 'Go to Design Tokens',
        href: '/tokens',
        group: 'Design Tokens',
        keywords: ['tokens', 'css', 'variables', 'theme', 'colors', 'design system'],
      });
      for (const token of rootSet.tokens) {
        globalSearchItems.push({
          value: `tokens/${token.name}`,
          label: token.variable,
          href: `/tokens#${token.category}`,
          group: 'Design Tokens',
          keywords: ['token', token.name, token.value, token.tailwindClass].filter(
            (k: Str): boolean => k.length > 0,
          ),
        });
      }
    }
  }

  // — New pages search items —
  globalSearchItems.push(
    {
      value: 'pages/getting-started',
      label: 'Getting Started',
      href: '/getting-started',
      group: 'Pages',
      keywords: ['getting started', 'onboarding', 'install', 'setup', 'guide', 'tutorial'],
    },
    {
      value: 'pages/changelog',
      label: "What's New",
      href: '/changelog',
      group: 'Pages',
      keywords: ['changelog', "what's new", 'updates', 'history', 'git', 'commits'],
    },
    {
      value: 'pages/icons',
      label: 'Icons',
      href: '/icons',
      group: 'Pages',
      keywords: ['icons', 'lucide', 'icon gallery', 'search icons', 'svg'],
    },
    {
      value: 'pages/browser-support',
      label: 'Browser & Device Support',
      href: '/browser-support',
      group: 'Pages',
      keywords: ['browser', 'device', 'support', 'compatibility', 'chrome', 'firefox', 'safari'],
    },
    {
      value: 'pages/about',
      label: 'About',
      href: '/about',
      group: 'Pages',
      keywords: ['about', 'mission', 'tech stack', 'version', 'license', 'contributors'],
    },
    {
      value: 'pages/support',
      label: 'Support',
      href: '/support',
      group: 'Pages',
      keywords: ['support', 'help', 'faq', 'bug report', 'feature request', 'contributing'],
    },
    {
      value: 'pages/styling',
      label: 'Styling',
      href: '/styling',
      group: 'Pages',
      keywords: ['styling', 'theming', 'themes', 'css', 'dark mode', 'colors', 'typography'],
    },
    {
      value: 'pages/accessibility',
      label: 'Accessibility',
      href: '/accessibility',
      group: 'Pages',
      keywords: ['accessibility', 'a11y', 'wcag', 'aria', 'keyboard', 'screen reader'],
    },
  );

  /** Current component name from the URL params. */
  const currentName: Str = $derived(page.params.name ?? '');

  /** Whether the current page is the tokens viewer. */
  const isTokensPage: boolean = $derived(page.url.pathname === '/tokens');

  /** Page title for breadcrumb display on new pages. */
  const currentPageTitle: Str = $derived.by((): Str => {
    const path: Str = page.url.pathname as Str;
    if (path === '/getting-started') return 'Getting Started' as Str;
    if (path === '/changelog') return "What's New" as Str;
    if (path === '/icons') return 'Icons' as Str;
    if (path === '/components/all') return 'All Components' as Str;
    if (path === '/components/category') return 'Categories' as Str;
    if (path === '/components/tags') return 'Tags' as Str;
    if (path === '/browser-support') return 'Browser Support' as Str;
    if (path === '/about') return 'About' as Str;
    if (path === '/support') return 'Support' as Str;
    if (path === '/styling') return 'Styling' as Str;
    if (path === '/accessibility') return 'Accessibility' as Str;
    return '' as Str;
  });

  /** Current category page name (from /components/category/[category]). */
  const currentCategory: Str = $derived(
    (page.url.pathname.match(/^\/components\/category\/([^/]+)/)?.[1] ?? '') as Str,
  );

  /** Current mode from mode-watcher for the toggle. */
  const currentMode: 'light' | 'dark' | 'system' = $derived(derivedMode.current ?? 'system');

  /**
   * Wrapper around mode-watcher's `setMode` to accept `Str` (from shared ModeToggle).
   *
   * mode-watcher's `setMode` only accepts `'light' | 'dark' | 'system'` — the shared
   * ModeToggle passes generic `Str`. Cast is safe because the toggle only emits valid modes.
   *
   * @param m - The mode string to set
   */
  const setMode = (m: Str): void => {
    // Shared ModeToggle only emits 'light' | 'dark' | 'system' — cast from Str is safe
    rawSetMode(m as 'light' | 'dark' | 'system');
  };

  /** Whether the global command search dialog is open. */
  let searchOpen: boolean = $state(false);

  /** Inline sidebar filter query (filters component list without opening command palette). */
  let sidebarFilter: Str = $state('' as Str);

  /** Breadcrumb dropdown search query. */
  let breadcrumbSearch: Str = $state('' as Str);

  /** Whether to hide incompatible components from the sidebar. Persisted to localStorage. */
  let hideIncompatible: boolean = $state(false);

  // Restore hideIncompatible from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(storageKey('lens-hide-incompatible'));
      if (stored === 'true') hideIncompatible = true;
    } catch {
      /* localStorage unavailable (SSR/incognito) — default false is fine */
    }
  });

  // Persist hideIncompatible to localStorage on change
  $effect(() => {
    try {
      localStorage.setItem(
        storageKey('lens-hide-incompatible'),
        hideIncompatible ? 'true' : 'false',
      );
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Pinned / favorites (persisted to localStorage)                     */
  /* ------------------------------------------------------------------ */

  /** Maximum number of pinned components. */
  const MAX_PINNED: Num = 20 as Num;

  /** Set of pinned component names. */
  let pinnedComponents: Set<Str> = $state(new Set());

  // Restore pinned from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(storageKey('lens-pinned'));
      if (stored) {
        const parsed: Str[] = JSON.parse(stored) as Str[];
        pinnedComponents = new Set(parsed.filter((n: Str): boolean => componentNames.includes(n)));
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — default empty is fine */
    }
  });

  // Persist pinned to localStorage on change
  $effect(() => {
    try {
      localStorage.setItem(storageKey('lens-pinned'), JSON.stringify([...pinnedComponents]));
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  });

  /**
   * Toggle a component's pinned state.
   *
   * Dispatches `lens:pin-changed` so the component page can update its pin indicator.
   *
   * @param name - Component directory name to toggle
   */
  function togglePin(name: Str): void {
    const next: Set<Str> = new Set(pinnedComponents);
    if (next.has(name)) {
      next.delete(name);
    } else if (next.size < MAX_PINNED) {
      next.add(name);
    }
    pinnedComponents = next;
    // Notify the component page of the pin state change
    document.dispatchEvent(
      new CustomEvent('lens:pin-changed', {
        detail: { name, pinned: next.has(name) },
      }),
    );
  }

  // Listen for toggle-pin events from the component page's LensHeader
  $effect(() => {
    /**
     * Handle toggle-pin request from component page.
     *
     * @param e - The custom event with component name detail
     */
    function onTogglePin(e: Event): Void {
      const componentName: Str = (e as CustomEvent).detail as Str;
      togglePin(componentName);
    }
    document.addEventListener('lens:toggle-pin', onTogglePin);
    return (): void => {
      document.removeEventListener('lens:toggle-pin', onTogglePin);
    };
  });

  /* ------------------------------------------------------------------ */
  /*  Recently viewed (persisted to localStorage)                        */
  /* ------------------------------------------------------------------ */

  /** Maximum recently viewed entries. */
  const MAX_RECENT: Num = 8 as Num;

  /** Ordered list of recently viewed component names (most recent first). */
  let recentComponents: Str[] = $state([]);

  // Restore recent from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(storageKey('lens-recent'));
      if (stored) {
        const parsed: Str[] = JSON.parse(stored) as Str[];
        recentComponents = parsed.filter((n: Str): boolean => componentNames.includes(n));
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — default empty is fine */
    }
  });

  // Track navigation — add current component to recent list
  // Uses untrack() to read recentComponents without subscribing, preventing infinite loop
  // Only adds valid components (must exist in componentNames) to prevent phantom entries
  $effect(() => {
    if (!currentName || currentName.length === 0 || !componentNames.includes(currentName)) return;
    const current: Str[] = untrack(() => recentComponents);
    const filtered: Str[] = current.filter((n: Str): boolean => n !== currentName);
    recentComponents = [currentName, ...filtered].slice(0, MAX_RECENT);
  });

  // Persist recent to localStorage on change
  $effect(() => {
    if (recentComponents.length === 0) return;
    try {
      localStorage.setItem(storageKey('lens-recent'), JSON.stringify(recentComponents));
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  });

  /** Clear all recently viewed components from state and localStorage. */
  function clearRecent(): void {
    recentComponents = [];
    try {
      localStorage.removeItem(storageKey('lens-recent'));
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  }

  /**
   * Remove a single component from the recently viewed list.
   *
   * @param name - Component name to remove
   */
  function removeRecent(name: Str): void {
    recentComponents = recentComponents.filter((n: Str): boolean => n !== name);
    try {
      if (recentComponents.length > 0) {
        localStorage.setItem(storageKey('lens-recent'), JSON.stringify(recentComponents));
      } else {
        localStorage.removeItem(storageKey('lens-recent'));
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  }

  /** Clear all pinned components from state and localStorage. */
  function clearAllPinned(): void {
    pinnedComponents = new Set();
    try {
      localStorage.removeItem(storageKey('lens-pinned'));
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Status badge helpers                                               */
  /* ------------------------------------------------------------------ */

  /** Status badge color mapping. */
  const STATUS_COLORS: Record<LensStatus, Str> = {
    new: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' as Str,
    updated: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' as Str,
    deprecated: 'bg-red-500/15 text-red-700 dark:text-red-400' as Str,
    placeholder: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' as Str,
  };

  /** Status badge labels. */
  const STATUS_LABELS: Record<LensStatus, Str> = {
    new: 'New' as Str,
    updated: 'Updated' as Str,
    deprecated: 'Deprecated' as Str,
    placeholder: 'Placeholder' as Str,
  };

  /**
   * Count compatible components within a category group.
   *
   * @param group - Category group to count
   * @returns Number of compatible components
   */
  function countCompatible(group: CategoryGroup): number {
    return group.components.filter((n: Str): boolean => compatByName.get(n)?.compatible ?? false)
      .length;
  }

  /**
   * Grouped components filtered by the inline sidebar filter and optionally by compatibility.
   * When filter is empty, returns all groups. Otherwise, filters component names
   * by case-insensitive substring match on name and title.
   */
  const filteredGroupedComponents: CategoryGroup[] = $derived(
    (sidebarFilter.length === 0
      ? groupedComponents
      : groupedComponents
          .map(
            (g: CategoryGroup): CategoryGroup => ({
              ...g,
              components: g.components.filter((n: Str): boolean => {
                const q: Str = sidebarFilter.toLowerCase() as Str;
                return n.toLowerCase().includes(q) || toTitle(n).toLowerCase().includes(q);
              }),
            }),
          )
          .filter((g: CategoryGroup): boolean => g.components.length > 0)
    )
      .map(
        (g: CategoryGroup): CategoryGroup =>
          hideIncompatible
            ? {
                ...g,
                components: g.components.filter(
                  (n: Str): boolean => compatByName.get(n)?.compatible ?? false,
                ),
              }
            : g,
      )
      .filter((g: CategoryGroup): boolean => g.components.length > 0),
  );

  /** Total design token count for the sidebar badge. */
  const tokenCount: number = $derived.by(() => {
    if (!cssRawSource) return 0;
    const sets: ThemeTokenSet[] = extractTokens(cssRawSource);
    const rootSet: ThemeTokenSet | undefined = sets.find(
      (s: ThemeTokenSet): boolean => s.selector === ':root',
    );
    return rootSet?.tokens.length ?? 0;
  });

  /**
   * Auto-expand the active component's category when navigating.
   * Also scrolls the active sidebar item into view after a short delay.
   */
  $effect(() => {
    if (!currentName) return;
    const meta: LensMeta | undefined = metaByName.get(currentName);
    const cat: Str = (meta?.category ?? 'display') as Str;
    // Ensure the parent "Components" group is open
    sidebarComponentsOpen = true;
    // Expand the category containing the active component
    sidebarCategoryOpen[cat] = true;
    // Scroll the active button in the categorized components section into view.
    // We pick the LAST matching element because Recent/Pinned duplicates appear
    // earlier in the DOM. Poll with rAF because the collapsible slide transition
    // (150ms) must finish before the target element exists in the DOM.
    // NOTE: We manually scroll the sidebar overflow container instead of using
    // scrollIntoView(), which calculates visibility relative to the viewport
    // and fails to scroll nested overflow containers like the sidebar.
    // Wait for sidebar layout to stabilize before scrolling. The $effect fires
    // before the sidebar is fully rendered on initial page load, so element
    // positions are inaccurate at that point. A 250ms delay ensures layout is
    // complete (collapsible animations are 150ms). We use setTimeout instead of
    // tick()+rAF because tick only waits for Svelte's microtask flush, not for
    // CSS transitions and browser layout/paint.
    setTimeout((): void => {
      const scrollContainer: HTMLElement | null = document.querySelector(
        '[data-sidebar="content"]',
      );
      const categorizedSection: HTMLElement | null = document.querySelector(
        '[data-section="categorized"]',
      );
      // Only look for active elements INSIDE the categorized section
      // to avoid finding duplicates in Recent/Pinned
      const activeEl: HTMLElement | null =
        categorizedSection?.querySelector('[data-sidebar="menu-button"][data-active="true"]') ??
        null;
      if (activeEl && scrollContainer) {
        const containerRect: DOMRect = scrollContainer.getBoundingClientRect();
        const elRect: DOMRect = activeEl.getBoundingClientRect();
        const elTopInContainer: Num = (elRect.top -
          containerRect.top +
          scrollContainer.scrollTop) as Num;
        const targetScroll: Num = (elTopInContainer -
          containerRect.height / 2 +
          elRect.height / 2) as Num;
        scrollContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        // Background shine: inject a real <div> overlay inside the element that
        // sweeps a gradient left-to-right. We use a child element instead of
        // ::after because the sidebar button has `overflow-clip` in its Tailwind
        // classes which clips pseudo-elements. The injected div has absolute
        // positioning and pointer-events:none so it layers on top without
        // affecting layout or clicks, and self-removes after the animation.
        if (!document.querySelector('#sidebar-scroll-shine')) {
          const style: HTMLStyleElement = document.createElement('style');
          style.id = 'sidebar-scroll-shine';
          style.textContent = `
            @keyframes sidebar-shine-sweep {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `;
          // svelte-check misresolves .append() to Fetch API in .svelte files;
          // prefer-dom-node-append disabled for .svelte in oxlintrc
          document.head.appendChild(style);
        }
        // Wait for the smooth scroll to finish before starting the shine.
        // 'scrollend' fires once the scroll animation settles.
        const startShine: () => void = (): void => {
          // Determine shine color based on background luminance so it works
          // in any theme (light, dark, forest green, etc.). Uses a 1x1 canvas
          // to convert any CSS color format (oklch, hsl, rgb, etc.) to RGB,
          // then picks white shine for dark backgrounds and black for light.
          const bgStr: Str = window.getComputedStyle(activeEl).backgroundColor as Str;
          const cvs: HTMLCanvasElement = document.createElement('canvas');
          cvs.width = 1;
          cvs.height = 1;
          const ctx: CanvasRenderingContext2D | null = cvs.getContext('2d');
          let shineBase: Str = 'rgba(255,255,255,' as Str;
          if (ctx) {
            ctx.fillStyle = bgStr;
            ctx.fillRect(0, 0, 1, 1);
            const px: Uint8ClampedArray = ctx.getImageData(0, 0, 1, 1).data;
            // sRGB relative luminance
            const lum: Num = ((0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]) / 255) as Num;
            shineBase = (lum > 0.5 ? 'rgba(0,0,0,' : 'rgba(255,255,255,') as Str;
          }
          // Temporarily override overflow-clip so the sweep is visible
          activeEl.style.overflow = 'hidden';
          activeEl.style.position = 'relative';
          const shineDiv: HTMLDivElement = document.createElement('div');
          shineDiv.style.cssText = [
            'position:absolute',
            'inset:0',
            'pointer-events:none',
            'border-radius:inherit',
            'z-index:10',
            `background:linear-gradient(90deg, transparent 0%, ${shineBase}0.2) 30%, ${shineBase}0.45) 50%, ${shineBase}0.2) 70%, transparent 100%)`,
            'animation:sidebar-shine-sweep 0.8s ease-in-out 2',
          ].join(';');
          shineDiv.addEventListener(
            'animationend',
            (): void => {
              shineDiv.remove();
              activeEl.style.overflow = '';
              activeEl.style.position = '';
            },
            { once: true },
          );
          // svelte-check misresolves .append() in .svelte files
          activeEl.appendChild(shineDiv);
        };
        scrollContainer.addEventListener('scrollend', startShine, { once: true });
        // Fallback: if scrollend doesn't fire (e.g. already at target position),
        // start the shine after a generous timeout matching typical smooth scroll duration.
        setTimeout((): void => {
          scrollContainer.removeEventListener('scrollend', startShine);
          if (!activeEl.querySelector('div[style*="sidebar-shine-sweep"]')) {
            startShine();
          }
        }, 600);
      }
    }, 250);
  });

  /**
   * `/` keyboard shortcut to focus the sidebar filter input.
   * Only fires when no input/textarea/select is focused.
   */
  $effect(() => {
    /**
     * Handle keydown for `/` shortcut.
     *
     * @param e - Keyboard event
     */
    function onSlashKey(e: KeyboardEvent): void {
      const tag: Str = (document.activeElement?.tagName ?? '') as Str;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      if (e.key === '/') {
        e.preventDefault();
        const filterInput: HTMLInputElement | null =
          document.querySelector('[data-sidebar-filter]');
        filterInput?.focus();
      }
    }
    window.addEventListener('keydown', onSlashKey);
    return (): void => {
      window.removeEventListener('keydown', onSlashKey);
    };
  });

  /* ------------------------------------------------------------------ */
  /*  Arrow-key sidebar navigation                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Arrow Up/Down navigates sidebar menu buttons; Enter follows the link.
   * Only active when sidebar content area has focus (not in inputs).
   */
  $effect(() => {
    /**
     * Handle arrow key navigation in sidebar.
     *
     * @param e - Keyboard event
     */
    function onArrowNav(e: KeyboardEvent): void {
      const tag: Str = (document.activeElement?.tagName ?? '') as Str;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;

      const buttons: HTMLElement[] = [
        ...document.querySelectorAll('[data-sidebar="menu-button"] a'),
      ] as HTMLElement[];
      if (buttons.length === 0) return;

      const currentIdx: Num = buttons.indexOf(document.activeElement as HTMLElement) as Num;

      if (e.key === 'Enter' && currentIdx >= 0) {
        e.preventDefault();
        (buttons[currentIdx] as HTMLAnchorElement).click();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx: Num = (currentIdx < buttons.length - 1 ? currentIdx + 1 : 0) as Num;
        buttons[nextIdx]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx: Num = (currentIdx > 0 ? currentIdx - 1 : buttons.length - 1) as Num;
        buttons[prevIdx]?.focus();
      }
    }
    window.addEventListener('keydown', onArrowNav);
    return (): void => {
      window.removeEventListener('keydown', onArrowNav);
    };
  });

  /* ------------------------------------------------------------------ */
  /*  Sidebar section collapse / expand state                            */
  /* ------------------------------------------------------------------ */

  /** Whether the "Pinned" sidebar section is open. */
  let sidebarPinnedOpen: boolean = $state(false);

  /** Whether the "Recent" sidebar section is open. */
  let sidebarRecentOpen: boolean = $state(false);

  /** Whether to show all pinned components (vs. first 5). */
  let showAllPinned: boolean = $state(false);

  /** Whether to show all recent components (vs. first 5). */
  let showAllRecent: boolean = $state(false);

  /** Confirm gate for "Clear all pinned" (resets after 3s). */
  let confirmClearPinned: boolean = $state(false);

  /** Confirm gate for "Clear recent" (resets after 3s). */
  let confirmClearRecent: boolean = $state(false);

  /** Timer ID for pinned confirm reset. */
  let confirmPinnedTimer: ReturnType<typeof setTimeout> | undefined;

  /** Timer ID for recent confirm reset. */
  let confirmRecentTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Handle "Clear all pinned" with 2-step confirmation.
   * First click arms, second click executes. Resets after 3s.
   */
  function handleClearPinned(): void {
    if (confirmClearPinned) {
      clearAllPinned();
      confirmClearPinned = false;
      if (confirmPinnedTimer) clearTimeout(confirmPinnedTimer);
    } else {
      confirmClearPinned = true;
      confirmPinnedTimer = setTimeout((): void => {
        confirmClearPinned = false;
      }, 3000);
    }
  }

  /**
   * Handle "Clear recent" with 2-step confirmation.
   * First click arms, second click executes. Resets after 3s.
   */
  function handleClearRecent(): void {
    if (confirmClearRecent) {
      clearRecent();
      confirmClearRecent = false;
      if (confirmRecentTimer) clearTimeout(confirmRecentTimer);
    } else {
      confirmClearRecent = true;
      confirmRecentTimer = setTimeout((): void => {
        confirmClearRecent = false;
      }, 3000);
    }
  }

  /** Whether the top-level "Components" collapsible group is open. */
  let sidebarComponentsOpen: boolean = $state(false);

  /** Name of the component whose compat tooltip is currently open (empty = none). */
  let compatTooltipOpenName: Str = $state('' as Str);

  /** Per-category collapsible open state (keyed by category name, default collapsed). */
  let sidebarCategoryOpen: Record<Str, boolean> = $state(
    Object.fromEntries(CATEGORY_ORDER.map((cat: Str): [Str, boolean] => [cat, false])),
  );

  /** Whether every sidebar section is currently expanded. */
  const sidebarAllExpanded: boolean = $derived(
    sidebarComponentsOpen &&
      sidebarPinnedOpen &&
      sidebarRecentOpen &&
      Object.values(sidebarCategoryOpen).every((v) => v === true),
  );

  /** Whether every sidebar section is currently collapsed. */
  const sidebarAllCollapsed: boolean = $derived(
    !sidebarComponentsOpen &&
      !sidebarPinnedOpen &&
      !sidebarRecentOpen &&
      Object.values(sidebarCategoryOpen).every((v) => v === false),
  );

  /** Saved category open state before search — restored when search is cleared. */
  let preSidebarSearchState: Record<Str, boolean> | null = $state(null);

  /**
   * Auto-expand all filtered categories while the sidebar search is active.
   * Saves pre-search state and restores it when the search is cleared.
   */
  $effect(() => {
    if (sidebarFilter.length > 0) {
      // Save current state before first search keystroke
      if (preSidebarSearchState === null) {
        preSidebarSearchState = { ...sidebarCategoryOpen };
      }
      // Expand all categories that have matching results
      for (const group of filteredGroupedComponents) {
        sidebarCategoryOpen[group.name] = true;
      }
    } else if (preSidebarSearchState !== null) {
      // Restore pre-search state when search is cleared
      for (const [cat, wasOpen] of Object.entries(preSidebarSearchState)) {
        sidebarCategoryOpen[cat as Str] = wasOpen;
      }
      preSidebarSearchState = null;
    }
  });

  /**
   * Expand all sidebar collapsible sections.
   */
  function expandAllSidebar(): void {
    sidebarComponentsOpen = true;
    sidebarPinnedOpen = true;
    sidebarRecentOpen = true;
    for (const cat of CATEGORY_ORDER) {
      sidebarCategoryOpen[cat] = true;
    }
  }

  /**
   * Collapse all sidebar collapsible sections.
   */
  function collapseAllSidebar(): void {
    sidebarComponentsOpen = false;
    sidebarPinnedOpen = false;
    sidebarRecentOpen = false;
    for (const cat of CATEGORY_ORDER) {
      sidebarCategoryOpen[cat] = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sidebar export                                                      */
  /* ------------------------------------------------------------------ */

  /** Sidebar export menu items with descriptions and file extension badges. */
  const SIDEBAR_EXPORT_ITEMS: Array<{
    id: Str;
    label: Str;
    icon: typeof ClipboardCopy;
    category: Str;
    description: Str;
    ext: Str;
  }> = [
    {
      id: 'copy-json',
      label: 'Copy as JSON',
      icon: ClipboardCopy,
      category: 'Clipboard',
      description: 'Components with categories, tags, and metadata',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Clipboard',
      description: 'Component table with categories and tags',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Full component index with all metadata',
      ext: '.json',
    },
    {
      id: 'download-markdown',
      label: 'Download Markdown',
      icon: Download,
      category: 'File',
      description: 'Full component index as formatted doc',
      ext: '.md',
    },
  ];

  /** Feedback state for sidebar export actions. */
  let sidebarExportFeedback: Str = $state('');

  /** Search query for sidebar export menu filtering. */
  let sidebarExportSearchQuery: Str = $state('');

  /** Sidebar export items filtered by search query (searches label, description, category). */
  const filteredSidebarExportItems = $derived(
    sidebarExportSearchQuery.length === 0
      ? SIDEBAR_EXPORT_ITEMS
      : SIDEBAR_EXPORT_ITEMS.filter((p) => {
          const q: Str = sidebarExportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
          );
        }),
  );

  /** Unique sidebar export categories present after filtering. */
  const filteredSidebarExportCategories: Str[] = $derived([
    ...new Set(filteredSidebarExportItems.map((p) => p.category)),
  ]);

  /**
   * Build the component index data for export.
   *
   * @returns Component index object with all components and metadata
   */
  function buildComponentIndex(): Record<Str, unknown> {
    const components: Array<Record<Str, unknown>> = componentNames.map((name: Str) => {
      const m: LensMeta | undefined = metaByName.get(name);
      return {
        name,
        title: toTitle(name),
        category: m?.category ?? 'display',
        tags: m?.tags ?? [],
        description: m?.description ?? '',
      };
    });
    return {
      totalComponents: componentNames.length,
      categories: CATEGORY_ORDER.filter((cat: Str) =>
        groupedComponents.some((g) => g.name === cat),
      ),
      components,
    };
  }

  /**
   * Convert component index to Markdown format.
   *
   * @returns Markdown string of the component index
   */
  function indexToMarkdown(): Str {
    const lines: Str[] = ['# Lens Component Index', ''];
    for (const group of groupedComponents) {
      lines.push(`## ${group.label} (${group.components.length})`, '');
      for (const name of group.components) {
        const m: LensMeta | undefined = metaByName.get(name);
        const desc: Str = m?.description ? ` — ${m.description}` : '';
        lines.push(`- **${toTitle(name)}**${desc}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  /**
   * Handle a sidebar export action.
   *
   * @param formatId - Export format identifier
   */
  async function handleSidebarExport(formatId: Str): Promise<void> {
    if (formatId === 'copy-json') {
      await navigator.clipboard.writeText(JSON.stringify(buildComponentIndex(), null, 2));
    } else if (formatId === 'copy-markdown') {
      await navigator.clipboard.writeText(indexToMarkdown());
    } else if (formatId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(buildComponentIndex(), null, 2)], {
        type: 'application/json',
      });
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lens-component-index.json';
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (formatId === 'download-markdown') {
      const blob: Blob = new Blob([indexToMarkdown()], { type: 'text/markdown' });
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lens-component-index.md';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    sidebarExportFeedback = formatId;
    setTimeout((): void => {
      sidebarExportFeedback = '';
    }, 2000);
  }

  /* ------------------------------------------------------------------ */
  /*  Notification center                                                */
  /* ------------------------------------------------------------------ */

  /** Whether the notification center dropdown is open. */
  let notifCenterOpen: boolean = $state(false);

  /** Two-step confirmation for clearing all notifications. */
  let confirmClearNotifs: boolean = $state(false);
  let confirmClearNotifsTimer: ReturnType<typeof setTimeout> | undefined;

  /** Reactive notification list (all stored). */
  const notifList: LensNotification[] = $derived(getNotifications());

  /** Reactive unread count. */
  const unreadCount: Num = $derived(getUnreadCount());

  /** Reactive preferences. */
  const notifPrefs: NotificationPreferences = $derived(getPreferences());

  /** Display filters — which severity types to show in the dropdown (independent of push prefs). */
  let notifDisplayFilters: Record<NotificationType, boolean> = $state({
    info: true,
    success: true,
    warning: true,
    error: true,
  });

  /** Search query for notification filter submenu. */
  let notifFilterSearchQuery: Str = $state('' as Str);

  /** Notifications filtered by display filters. */
  const filteredNotifList: LensNotification[] = $derived(
    notifList.filter(
      (n: LensNotification): boolean => notifDisplayFilters[n.type as NotificationType] ?? true,
    ),
  );

  /** Number of notifications to render (progressive scroll). */
  let visibleNotifCount: Num = $state(50 as Num);

  /** Notifications to actually render (paginated slice of filtered list). */
  const displayedNotifs: LensNotification[] = $derived(
    filteredNotifList.slice(0, visibleNotifCount as number),
  );

  /** Whether there are more notifications to load. */
  const hasMoreNotifs: boolean = $derived((visibleNotifCount as number) < filteredNotifList.length);

  /** Reset visible count when filters change. */
  $effect(() => {
    /* Subscribe to display filter changes — reset pagination */
    const _filters = notifDisplayFilters;
    visibleNotifCount = 50 as Num;
  });

  // Load notifications from localStorage on mount
  $effect(() => {
    loadNotifications();
  });

  /**
   * Fire a toast and push to notification center.
   *
   * @param opts - Notification options
   */
  function notify(opts: {
    type: NotificationType;
    title: Str;
    message?: Str;
    actionLabel?: Str;
    actionHref?: Str;
    componentName?: Str;
    category?: Str;
    /** When true, push to notification center but skip toast popup. */
    silent?: boolean;
  }): void {
    if (!isTypeEnabled(opts.type)) return;
    const notif: LensNotification = pushNotification(opts);
    const prefs: NotificationPreferences = getPreferences();
    if (prefs.showToasts && !opts.silent) {
      /** Toast function lookup by notification type. */
      const TOAST_FNS: Record<NotificationType, typeof toast.info> = {
        error: toast.error,
        warning: toast.warning,
        success: toast.success,
        info: toast.info,
      };
      const toastFn: typeof toast.info = TOAST_FNS[opts.type];
      toastFn(opts.title, {
        description: opts.message,
        duration: prefs.autoDismissMs,
        action: opts.actionHref
          ? {
              label: opts.actionLabel ?? 'View',
              onClick: (): void => {
                window.location.href = opts.actionHref ?? '';
              },
            }
          : undefined,
      });
    }
    // Mark read when notification center is already open
    if (notifCenterOpen) {
      markRead(notif.id);
    }
  }

  /**
   * Format a relative time string from an ISO timestamp.
   *
   * @param iso - ISO 8601 timestamp
   * @returns Human-readable relative time (e.g. "2m ago", "3h ago", "Yesterday")
   */
  function relativeTime(iso: Str): Str {
    const diff: number = Date.now() - new Date(iso).getTime();
    const mins: number = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now' as Str;
    if (mins < 60) return `${mins}m ago` as Str;
    const hours: number = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago` as Str;
    const days: number = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday' as Str;
    if (days < 7) return `${days}d ago` as Str;
    return `${Math.floor(days / 7)}w ago` as Str;
  }

  /* ------------------------------------------------------------------ */
  /*  Watched components                                                 */
  /* ------------------------------------------------------------------ */

  /** Maximum watched components. */
  const MAX_WATCHED: Num = 20 as Num;

  /** Set of watched component names. */
  let watchedComponents: Set<Str> = $state(new Set());

  // Restore watched from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(storageKey('lens-watched'));
      if (stored) {
        const parsed: Str[] = JSON.parse(stored) as Str[];
        watchedComponents = new Set(parsed.filter((n: Str): boolean => componentNames.includes(n)));
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — default empty is fine */
    }
  });

  // Persist watched to localStorage on change
  $effect(() => {
    if (watchedComponents.size === 0) return;
    try {
      localStorage.setItem(storageKey('lens-watched'), JSON.stringify([...watchedComponents]));
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  });

  /**
   * Toggle a component's watched state.
   *
   * @param name - Component directory name to toggle
   */
  function toggleWatch(name: Str): void {
    const next: Set<Str> = new Set(watchedComponents);
    if (next.has(name)) {
      next.delete(name);
    } else if (next.size < (MAX_WATCHED as number)) {
      next.add(name);
    }
    watchedComponents = next;
    // Persist immediately since effect won't fire for empty→empty
    try {
      if (next.size > 0) {
        localStorage.setItem(storageKey('lens-watched'), JSON.stringify([...next]));
      } else {
        localStorage.removeItem(storageKey('lens-watched'));
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  }

  // Listen for watch toggle events from the component page
  $effect(() => {
    /**
     * Handle watch toggle request from component page.
     *
     * @param e - The custom event with component name detail
     */
    function onToggleWatch(e: Event): Void {
      const componentName: Str = (e as CustomEvent).detail as Str;
      toggleWatch(componentName);
    }
    document.addEventListener('lens:toggle-watch', onToggleWatch);
    return (): void => {
      document.removeEventListener('lens:toggle-watch', onToggleWatch);
    };
  });

  // Listen for watch state queries and respond
  $effect(() => {
    /**
     * Handle watch state changed dispatch to component page.
     *
     * @param e - The custom event with component name detail
     */
    function onWatchChanged(e: Event): Void {
      const componentName: Str = (e as CustomEvent).detail as Str;
      document.dispatchEvent(
        new CustomEvent('lens:watch-changed', {
          detail: { name: componentName, watched: watchedComponents.has(componentName) },
        }),
      );
    }
    document.addEventListener('lens:toggle-watch', onWatchChanged);
    return (): void => {
      document.removeEventListener('lens:toggle-watch', onWatchChanged);
    };
  });

  /* ------------------------------------------------------------------ */
  /*  Dependency & status change notifications (on navigation)           */
  /* ------------------------------------------------------------------ */

  // Generate notifications for component status and dependency changes
  $effect(() => {
    if (!currentName || currentName.length === 0 || !componentNames.includes(currentName)) return;
    const meta: LensMeta | undefined = metaByName.get(currentName);

    // Status notification for watched components
    if (meta?.status && watchedComponents.has(currentName)) {
      const statusLabels: Record<string, Str> = {
        new: 'recently added' as Str,
        updated: 'recently updated' as Str,
        deprecated: 'deprecated' as Str,
      };
      const label: Str = statusLabels[meta.status] ?? (meta.status as Str);
      notify({
        type: meta.status === 'deprecated' ? 'warning' : 'info',
        title: `${toTitle(currentName)} is ${label}` as Str,
        componentName: currentName,
        actionLabel: 'View' as Str,
        actionHref: `/components/${currentName}` as Str,
        category: 'status' as Str,
      });
    }
  });

  // Generate compatibility notifications on load:
  // - One summary toast (visible popup)
  // - One silent notification per incompatible component (notification center only)
  /** Whether compatibility notifications have been generated this session. */
  let compatNotifsGenerated: boolean = $state(false);

  $effect(() => {
    if (compatNotifsGenerated) return;
    if (componentNames.length === 0) return;
    compatNotifsGenerated = true;

    // Skip if compatibility notifications already exist from a previous session
    const existingCompat: LensNotification[] = getNotifications().filter(
      (n: LensNotification): boolean => n.category === 'compatibility',
    );
    if (existingCompat.length > 0) return;

    const incompatible: Str[] = componentNames.filter((n: Str): boolean => {
      const c: LensCompatibility | undefined = compatByName.get(n);
      return c !== undefined && !c.compatible;
    });

    if (incompatible.length === 0) return;

    // Summary toast — always fires regardless of notification preferences
    const topNames: Str = incompatible.slice(0, 5).map(toTitle).join(', ') as Str;
    const remaining: Num = (incompatible.length - 5) as Num;
    const summaryMsg: Str = (
      (remaining as number) > 0 ? `${topNames}, and ${remaining} more` : topNames
    ) as Str;
    const summaryTitle: Str =
      `${incompatible.length} component${incompatible.length === 1 ? '' : 's'} with compatibility issues` as Str;

    // Push to notification center (bypasses isTypeEnabled)
    pushNotification({
      type: 'warning' as NotificationType,
      title: summaryTitle,
      message: summaryMsg,
      actionLabel: 'View All' as Str,
      actionHref: '/components/all' as Str,
      category: 'compatibility' as Str,
    });

    // Always show toast (bypasses preference check)
    toast.warning(summaryTitle, {
      description: summaryMsg,
      duration: 8000,
      action: {
        label: 'View All',
        onClick: (): void => {
          window.location.href = '/components/all';
        },
      },
    });

    // Per-component notifications (batch — single persist, no toasts)
    const batchItems: Array<{
      type: NotificationType;
      title: Str;
      message?: Str;
      actionLabel?: Str;
      actionHref?: Str;
      componentName?: Str;
      category?: Str;
    }> = incompatible.map((name: Str) => {
      const compat: LensCompatibility | undefined = compatByName.get(name);
      const failedRules: Set<number> = new Set(
        (compat?.violations ?? []).map((vi) => vi.rule as number),
      );
      const ruleIds: Str = [...failedRules]
        .map((idx: number): Str => `R${idx}` as Str)
        .join(', ') as Str;
      return {
        type: 'warning' as NotificationType,
        title:
          `${toTitle(name)} — ${failedRules.size} rule violation${failedRules.size === 1 ? '' : 's'}` as Str,
        message: ruleIds,
        componentName: name,
        actionLabel: 'View Component' as Str,
        actionHref: `/components/${name}` as Str,
        category: 'compatibility' as Str,
      };
    });
    pushNotificationBatch(batchItems);
  });

  /* ------------------------------------------------------------------ */
  /*  Documentation coverage alerts                                      */
  /* ------------------------------------------------------------------ */

  /** Notification type descriptions for preference tooltips. */
  const NOTIF_TYPE_DESCS: Record<Str, Str> = {
    info: 'General updates and informational messages' as Str,
    success: 'Successful operations and completions' as Str,
    warning: 'Deprecation notices and potential issues' as Str,
    error: 'Errors and failures requiring attention' as Str,
  };

  /** Whether the doc coverage alert has been dismissed this session. */
  let docCoverageAlertDismissed: boolean = $state(false);

  /** Undocumented component names. */
  const undocumentedComponents: Str[] = $derived(
    componentNames.filter((n: Str): boolean => !metaByName.has(n)),
  );
</script>

<ModeWatcher
  defaultMode="system"
  disableTransitions={false}
  disableHeadScriptInjection
  modeStorageKey={storageKey('mode')}
  themeStorageKey={storageKey('theme')}
/>

<Sidebar.Provider
  class="min-h-svh"
  style="--sidebar-width: 280px; --header-height: calc(var(--spacing) * 12);"
>
  <Sidebar.Root>
    <Sidebar.Header>
      <div class="flex items-center gap-2 px-2 py-1.5">
        <AppLogo size={20} />
        <span class="text-sm font-semibold tracking-tight">Lens</span>
        <div class="ml-auto">
          <DropdownMenu.Root>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: tooltipProps })}
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: triggerProps })}
                      <button
                        type="button"
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        {...tooltipProps}
                        {...triggerProps}
                      >
                        <EllipsisVertical class="size-4" />
                        <span class="sr-only">Sidebar menu</span>
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content side="right" sideOffset={4}>Sidebar menu</Tooltip.Content>
            </Tooltip.Root>
            <DropdownMenu.Content align="start" sideOffset={4}>
              <DropdownMenu.Sub
                onOpenChange={(open) => {
                  if (open) sidebarExportSearchQuery = '';
                }}
              >
                <DropdownMenu.SubTrigger>
                  <Download class="mr-2 size-4" />
                  Export
                </DropdownMenu.SubTrigger>
                <DropdownMenu.SubContent class="flex max-h-[28rem] w-64 flex-col overflow-hidden">
                  <div class="shrink-0 px-2 pb-1.5 pt-1">
                    <div
                      class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                    >
                      <SearchIcon
                        class="size-3 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        placeholder="Search formats..."
                        class="h-5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                        bind:value={sidebarExportSearchQuery}
                        onclick={(e) => e.stopPropagation()}
                        onkeydown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto">
                    {#if filteredSidebarExportItems.length === 0}
                      <div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
                        <SearchX class="size-4 text-muted-foreground/40" />
                        <span class="text-xs text-muted-foreground/60">No formats match</span>
                      </div>
                    {:else}
                      {#each filteredSidebarExportCategories as category (category)}
                        <DropdownMenu.Label
                          class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                        >
                          {#if category === 'Clipboard'}
                            <Clipboard class="size-3" />
                          {:else}
                            <Download class="size-3" />
                          {/if}
                          {category}
                        </DropdownMenu.Label>
                        {#each filteredSidebarExportItems.filter((p) => p.category === category) as item (item.id)}
                          <DropdownMenu.Item
                            onSelect={(e) => {
                              e.preventDefault();
                              handleSidebarExport(item.id);
                            }}
                          >
                            {#if sidebarExportFeedback === item.id}
                              <span in:fade={{ duration: 150 }}
                                ><Check class="mr-2 size-4 text-green-500" /></span
                              >
                            {:else}
                              <item.icon class="mr-2 size-4" />
                            {/if}
                            <div class="flex min-w-0 flex-1 flex-col">
                              <span class="text-sm">{item.label}</span>
                              <span class="text-[11px] text-muted-foreground/60"
                                >{item.description}</span
                              >
                            </div>
                            {#if item.ext}
                              <code
                                class="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                                >{item.ext}</code
                              >
                            {/if}
                          </DropdownMenu.Item>
                        {/each}
                      {/each}
                    {/if}
                  </div>
                </DropdownMenu.SubContent>
              </DropdownMenu.Sub>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onclick={expandAllSidebar} disabled={sidebarAllExpanded}>
                <ChevronsUpDown class="mr-2 size-4" />
                Expand All
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={collapseAllSidebar} disabled={sidebarAllCollapsed}>
                <ChevronsDownUp class="mr-2 size-4" />
                Collapse All
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    </Sidebar.Header>
    <Sidebar.Content class="gap-1">
      <!-- Overview + Getting Started -->
      <Sidebar.Group class="py-0 pt-2">
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/components' && !currentName}>
              {#snippet child({ props })}
                <a href="/components" {...props}>
                  <Home class="size-4" />
                  <span>Overview</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/getting-started'}>
              {#snippet child({ props })}
                <a href="/getting-started" {...props}>
                  <BookOpen class="size-4" />
                  <span>Getting Started</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
      <!-- Pinned components -->
      {#if pinnedComponents.size > 0}
        {@const pinnedList = [...pinnedComponents]}
        {#snippet pinnedItem(name: Str)}
          {@const pinMeta = metaByName.get(name)}
          {@const PinIcon = CATEGORY_ICONS[pinMeta?.category ?? 'display'] ?? ComponentIcon}
          {@const pinColor =
            CATEGORY_COLORS[pinMeta?.category ?? 'display'] ?? ('text-muted-foreground' as Str)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={currentName === name}>
              {#snippet child({ props })}
                <a href="/components/{name}" {...props}>
                  <PinIcon class="size-4 {pinColor}" />
                  <span>{toTitle(name)}</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
            <Sidebar.MenuAction>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: unpinTip })}
                    <button
                      type="button"
                      class="flex size-5 items-center justify-center rounded-sm text-muted-foreground/50 hover:text-foreground"
                      {...unpinTip}
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePin(name);
                      }}
                    >
                      <StarOff class="size-3" />
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="right" sideOffset={4}>Unpin</Tooltip.Content>
              </Tooltip.Root>
            </Sidebar.MenuAction>
          </Sidebar.MenuItem>
        {/snippet}
        <Collapsible.Root bind:open={sidebarPinnedOpen} class="group/pinned">
          <Sidebar.Group class="py-0">
            <Sidebar.GroupLabel
              class="h-8 gap-2 text-sm rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              {#snippet child({ props: pinnedLabelProps })}
                <Collapsible.Trigger {...pinnedLabelProps}>
                  <Star class="size-3" />
                  Pinned
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      class="ml-auto rounded-sm p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                      onclick={(e) => e.stopPropagation()}
                    >
                      <EllipsisVertical class="size-3.5" />
                      <span class="sr-only">Pinned options</span>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="w-44">
                      <DropdownMenu.Item
                        variant="destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          handleClearPinned();
                        }}
                      >
                        <Trash2 class="mr-2 size-4" />
                        {confirmClearPinned ? 'Confirm Clear' : 'Clear all pinned'}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  <ChevronRight
                    class="transition-transform group-data-[state=open]/pinned:rotate-90"
                  />
                </Collapsible.Trigger>
              {/snippet}
            </Sidebar.GroupLabel>
            <Collapsible.Content>
              <div transition:slide={{ duration: 150 }}>
                <Sidebar.GroupContent>
                  <Sidebar.Menu>
                    {#each pinnedList.slice(0, 5) as name (name)}
                      {@render pinnedItem(name)}
                    {/each}
                    {#if pinnedList.length > 5}
                      {#if showAllPinned}
                        <div transition:slide={{ duration: 150 }}>
                          {#each pinnedList.slice(5) as name (name)}
                            {@render pinnedItem(name)}
                          {/each}
                        </div>
                      {/if}
                      <li class="px-2 py-0.5">
                        <button
                          type="button"
                          class="w-full text-center text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
                          onclick={() => (showAllPinned = !showAllPinned)}
                        >
                          {showAllPinned ? 'Show less' : `Show ${pinnedList.length - 5} more…`}
                        </button>
                      </li>
                    {/if}
                  </Sidebar.Menu>
                </Sidebar.GroupContent>
              </div>
            </Collapsible.Content>
          </Sidebar.Group>
        </Collapsible.Root>
      {/if}
      <!-- Recently viewed -->
      {#if recentComponents.length > 0}
        {@const recentList = recentComponents.filter((n) => !pinnedComponents.has(n))}
        {#snippet recentItem(name: Str)}
          {@const recMeta = metaByName.get(name)}
          {@const RecIcon = CATEGORY_ICONS[recMeta?.category ?? 'display'] ?? ComponentIcon}
          {@const recColor =
            CATEGORY_COLORS[recMeta?.category ?? 'display'] ?? ('text-muted-foreground' as Str)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={currentName === name}>
              {#snippet child({ props })}
                <a href="/components/{name}" {...props}>
                  <RecIcon class="size-4 {recColor}" />
                  <span>{toTitle(name)}</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
            <Sidebar.MenuAction>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: removeTip })}
                    <button
                      type="button"
                      class="flex size-5 items-center justify-center rounded-sm text-muted-foreground/50 hover:text-foreground"
                      {...removeTip}
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeRecent(name);
                      }}
                    >
                      <XIcon class="size-3" />
                    </button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content side="right" sideOffset={4}>Remove</Tooltip.Content>
              </Tooltip.Root>
            </Sidebar.MenuAction>
          </Sidebar.MenuItem>
        {/snippet}
        <Collapsible.Root bind:open={sidebarRecentOpen} class="group/recent">
          <Sidebar.Group class="py-0">
            <Sidebar.GroupLabel
              class="h-8 gap-2 text-sm rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              {#snippet child({ props: recentLabelProps })}
                <Collapsible.Trigger {...recentLabelProps}>
                  <Clock class="size-3" />
                  Recent
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      class="ml-auto rounded-sm p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
                      onclick={(e) => e.stopPropagation()}
                    >
                      <EllipsisVertical class="size-3.5" />
                      <span class="sr-only">Recent options</span>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end" class="w-44">
                      <DropdownMenu.Item
                        variant="destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          handleClearRecent();
                        }}
                      >
                        <Trash2 class="mr-2 size-4" />
                        {confirmClearRecent ? 'Confirm Clear' : 'Clear recent'}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  <ChevronRight
                    class="transition-transform group-data-[state=open]/recent:rotate-90"
                  />
                </Collapsible.Trigger>
              {/snippet}
            </Sidebar.GroupLabel>
            <Collapsible.Content>
              <div transition:slide={{ duration: 150 }}>
                <Sidebar.GroupContent>
                  <Sidebar.Menu>
                    {#each recentList.slice(0, 5) as name (name)}
                      {@render recentItem(name)}
                    {/each}
                    {#if recentList.length > 5}
                      {#if showAllRecent}
                        <div transition:slide={{ duration: 150 }}>
                          {#each recentList.slice(5) as name (name)}
                            {@render recentItem(name)}
                          {/each}
                        </div>
                      {/if}
                      <li class="px-2 py-0.5">
                        <button
                          type="button"
                          class="w-full text-center text-[11px] text-muted-foreground/60 transition-colors hover:text-foreground"
                          onclick={() => (showAllRecent = !showAllRecent)}
                        >
                          {showAllRecent ? 'Show less' : `Show ${recentList.length - 5} more…`}
                        </button>
                      </li>
                    {/if}
                  </Sidebar.Menu>
                </Sidebar.GroupContent>
              </div>
            </Collapsible.Content>
          </Sidebar.Group>
        </Collapsible.Root>
      {/if}
      <Collapsible.Root
        bind:open={sidebarComponentsOpen}
        class="group/collapsible"
        data-section="categorized"
      >
        <Sidebar.Group class="py-0">
          <Sidebar.GroupLabel
            class="h-8 gap-2 text-sm font-semibold rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {#snippet child({ props })}
              <Collapsible.Trigger {...props}>
                <LayoutGrid class="size-3" />
                Components
                <ChevronRight
                  class="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90"
                />
              </Collapsible.Trigger>
            {/snippet}
          </Sidebar.GroupLabel>
          <!-- Filter + hide incompatible controls — outside Collapsible.Content so sticky works -->
          {#if sidebarComponentsOpen}
            <div class="sticky top-0 z-10 bg-sidebar px-2 pb-0.5 pt-1">
              <!-- Inline filter input -->
              <div class="pb-1.5">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <Filter class="size-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                  <input
                    type="text"
                    data-sidebar-filter
                    placeholder="Filter..."
                    class="h-5 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    bind:value={sidebarFilter}
                  />
                  {#if sidebarFilter.length > 0}
                    <button
                      type="button"
                      class="shrink-0 text-muted-foreground/50 hover:text-foreground"
                      onclick={() => {
                        sidebarFilter = '' as Str;
                      }}
                      aria-label="Clear filter"
                    >
                      <SearchX class="size-3" />
                    </button>
                  {/if}
                  <Kbd label="/" class="ml-auto shrink-0 text-[10px]" />
                </div>
              </div>
              <!-- Hide incompatible toggle -->
              <div class="pb-0.5">
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger>
                    {#snippet child({ props: toggleTooltipProps })}
                      <button
                        type="button"
                        class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent/50 {hideIncompatible
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'}"
                        {...toggleTooltipProps}
                        onclick={() => {
                          hideIncompatible = !hideIncompatible;
                        }}
                      >
                        <EyeOff class="size-3 shrink-0" aria-hidden="true" />
                        <span>{hideIncompatible ? 'Show incompatible' : 'Hide incompatible'}</span>
                        {#if hideIncompatible}
                          <span class="ml-auto" in:fade={{ duration: 150 }}
                            ><Check class="size-3 text-green-500" aria-hidden="true" /></span
                          >
                        {/if}
                      </button>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content side="right" sideOffset={8} class="max-w-48">
                    <p class="text-xs">
                      {hideIncompatible ? 'Showing compatible only' : 'Show all components'}
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            </div>
          {/if}
          <Collapsible.Content>
            <Sidebar.GroupContent>
              {#if filteredGroupedComponents.length === 0}
                <div class="flex flex-col items-center gap-1.5 px-2 py-6 text-center">
                  {#if sidebarFilter.length > 0}
                    <SearchX class="size-4 text-muted-foreground/40" />
                    <span class="text-xs text-muted-foreground/60">No components match</span>
                  {:else}
                    <ComponentIcon class="size-5 text-muted-foreground/30" />
                    <span class="text-xs font-medium text-muted-foreground/50">No components</span>
                    <span class="text-[11px] leading-snug text-muted-foreground/40">
                      Add lens.ts files to register components
                    </span>
                  {/if}
                </div>
              {/if}
              {#each filteredGroupedComponents as group (group.name)}
                {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
                {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
                <Collapsible.Root
                  bind:open={sidebarCategoryOpen[group.name]}
                  class="group/category mb-0.5"
                >
                  <Tooltip.Root delayDuration={400}>
                    <Tooltip.Trigger>
                      {#snippet child({ props: catTooltipProps })}
                        <Collapsible.Trigger
                          class="flex w-full items-center gap-1.5 rounded-md px-3 py-1 transition-colors hover:bg-accent/50"
                          {...catTooltipProps}
                        >
                          <ChevronRight
                            class="size-3 text-muted-foreground/50 transition-transform group-data-[state=open]/category:rotate-90"
                          />
                          <CatIcon class="size-3.5 {catColor}"></CatIcon>
                          <span
                            class="text-[13px] font-medium uppercase tracking-wider text-muted-foreground/70"
                            >{group.label}</span
                          >
                          {@const compatCount = countCompatible(group)}
                          <span
                            class="ml-auto inline-flex items-center gap-1 text-[10px] tabular-nums leading-none {compatCount <
                            group.components.length
                              ? 'text-amber-500/70 dark:text-amber-400/70'
                              : 'text-muted-foreground/40'}"
                          >
                            <span
                              class="inline-block size-1.5 rounded-full {compatCount >=
                              group.components.length
                                ? 'bg-emerald-500/60'
                                : 'bg-amber-500/60'}"
                            ></span>
                            {compatCount}<span class="opacity-40">/</span>{group.components.length}
                          </span>
                        </Collapsible.Trigger>
                      {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="right" sideOffset={8} class="max-w-56">
                      {#if CATEGORY_DESCRIPTIONS[group.name]}
                        <p class="text-xs">{CATEGORY_DESCRIPTIONS[group.name]}</p>
                      {/if}
                      {@const tipCompat = countCompatible(group)}
                      <p class="mt-1 text-[10px] opacity-70">
                        {tipCompat} of {group.components.length} component{group.components
                          .length === 1
                          ? ''
                          : 's'} pass all compatibility rules
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                  <Collapsible.Content>
                    <div transition:slide={{ duration: 150 }}>
                      <Sidebar.Menu class="pl-4">
                        {#each group.components as name (name)}
                          {@const itemMeta = metaByName.get(name)}
                          {@const itemCompat = compatByName.get(name)}
                          {@const isIncompat = itemCompat ? !itemCompat.compatible : false}
                          {@const ItemIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
                          {@const itemColor =
                            CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
                          <Sidebar.MenuItem>
                            <Tooltip.Provider disableHoverableContent={false}>
                              <Tooltip.Root
                                delayDuration={400}
                                onOpenChange={(open) => {
                                  compatTooltipOpenName = (open ? name : '') as Str;
                                }}
                              >
                                <Tooltip.Trigger>
                                  {#snippet child({ props: tooltipProps })}
                                    <Sidebar.MenuButton
                                      isActive={currentName === name}
                                      {...tooltipProps}
                                    >
                                      {#snippet child({ props })}
                                        <a
                                          href="/components/{name}"
                                          {...props}
                                          class="{props.class ?? ''} {isIncompat
                                            ? 'opacity-50'
                                            : ''}"
                                        >
                                          <ItemIcon class="size-4 {itemColor}"></ItemIcon>
                                          <span>{toTitle(name)}</span>
                                          {#if itemMeta?.status}
                                            <span
                                              class="ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none {STATUS_COLORS[
                                                itemMeta.status
                                              ]}">{STATUS_LABELS[itemMeta.status]}</span
                                            >
                                          {:else if isIncompat}
                                            <CircleAlert
                                              class="ml-auto size-3 shrink-0 text-amber-500"
                                              aria-hidden="true"
                                            />
                                          {/if}
                                        </a>
                                      {/snippet}
                                    </Sidebar.MenuButton>
                                  {/snippet}
                                </Tooltip.Trigger>
                                <Tooltip.Content
                                  side="right"
                                  sideOffset={0}
                                  class="max-w-96 max-h-[min(24rem,80vh)] overflow-y-auto"
                                >
                                  {#if itemMeta?.description}
                                    <p class="text-xs">{itemMeta.description}</p>
                                  {/if}
                                  {#if itemMeta?.tags && itemMeta.tags.length > 0}
                                    <div class="mt-1 flex flex-wrap gap-1">
                                      {#each itemMeta.tags as tag (tag)}
                                        <span
                                          class="inline-flex items-center gap-0.5 rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px]"
                                          ><Tag class="size-2.5 shrink-0 opacity-60" />{tag}</span
                                        >
                                      {/each}
                                    </div>
                                  {/if}
                                  {#if itemCompat}
                                    {@const failedRules = new Set(
                                      itemCompat.violations.map((v) => v.rule as Num),
                                    )}
                                    <div class="mt-1.5 border-t border-border pt-1.5">
                                      <CompatRuleList
                                        ruleNames={LENS_RULE_NAMES}
                                        violations={failedRules}
                                      />
                                    </div>
                                  {/if}
                                </Tooltip.Content>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                            <Sidebar.MenuAction
                              class={compatTooltipOpenName === name ? 'pointer-events-none' : ''}
                            >
                              <Tooltip.Provider>
                                <Tooltip.Root delayDuration={300}>
                                  <Tooltip.Trigger>
                                    {#snippet child({ props: pinTip })}
                                      <button
                                        type="button"
                                        class="flex size-5 items-center justify-center rounded-sm text-muted-foreground/40 transition-colors hover:text-foreground {pinnedComponents.has(
                                          name,
                                        )
                                          ? 'text-amber-500 hover:text-amber-600'
                                          : ''}"
                                        {...pinTip}
                                        onclick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          togglePin(name);
                                        }}
                                      >
                                        <Star
                                          class="size-3 {pinnedComponents.has(name)
                                            ? 'fill-current'
                                            : ''}"
                                        />
                                      </button>
                                    {/snippet}
                                  </Tooltip.Trigger>
                                  <Tooltip.Content side="right" sideOffset={4}>
                                    {pinnedComponents.has(name) ? 'Unpin' : 'Pin to sidebar'}
                                  </Tooltip.Content>
                                </Tooltip.Root>
                              </Tooltip.Provider>
                            </Sidebar.MenuAction>
                          </Sidebar.MenuItem>
                        {/each}
                      </Sidebar.Menu>
                    </div>
                  </Collapsible.Content>
                </Collapsible.Root>
              {/each}
            </Sidebar.GroupContent>
          </Collapsible.Content>
        </Sidebar.Group>
      </Collapsible.Root>
      <!-- Browse: All Components, Categories, Tags -->
      <Sidebar.Group class="py-0">
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/components/all'}>
              {#snippet child({ props })}
                <a href="/components/all" {...props}>
                  <ComponentIcon class="size-4" />
                  <span>All Components</span>
                  <Badge
                    variant="secondary"
                    class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none tabular-nums"
                    >{componentNames.length.toLocaleString()}</Badge
                  >
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/components/category'}>
              {#snippet child({ props })}
                <a href="/components/category" {...props}>
                  <LayoutGrid class="size-4" />
                  <span>Categories</span>
                  <Badge
                    variant="secondary"
                    class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none tabular-nums"
                    >{groupedComponents.length.toLocaleString()}</Badge
                  >
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/components/tags'}>
              {#snippet child({ props })}
                <a href="/components/tags" {...props}>
                  <Tag class="size-4" />
                  <span>Tags</span>
                  {#if allUniqueTags.length > 0}
                    <Badge
                      variant="secondary"
                      class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none tabular-nums"
                      >{allUniqueTags.length.toLocaleString()}</Badge
                    >
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>

      <!-- Reference: Design Tokens, Icons, What's New -->
      <Sidebar.Group class="py-0">
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/tokens'}>
              {#snippet child({ props })}
                <a href="/tokens" {...props}>
                  <Palette class="size-4" />
                  <span>Design Tokens</span>
                  {#if tokenCount > 0}
                    <Badge
                      variant="secondary"
                      class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none tabular-nums"
                      >{tokenCount.toLocaleString()}</Badge
                    >
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/icons'}>
              {#snippet child({ props })}
                <a href="/icons" {...props}>
                  <Shapes class="size-4" />
                  <span>Icons</span>
                  {#if data?.iconCount > 0}
                    <Badge
                      variant="secondary"
                      class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none tabular-nums"
                      >{data.iconCount.toLocaleString()}</Badge
                    >
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/changelog'}>
              {#snippet child({ props })}
                <a href="/changelog" {...props}>
                  <Newspaper class="size-4" />
                  <span>What's New</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/browser-support'}>
              {#snippet child({ props })}
                <a href="/browser-support" {...props}>
                  <Monitor class="size-4" />
                  <span>Browser Support</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/styling'}>
              {#snippet child({ props })}
                <a href="/styling" {...props}>
                  <PaintbrushIcon class="size-4" />
                  <span>Styling</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/accessibility'}>
              {#snippet child({ props })}
                <a href="/accessibility" {...props}>
                  <AccessibilityIcon class="size-4" />
                  <span>Accessibility</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/about'}>
              {#snippet child({ props })}
                <a href="/about" {...props}>
                  <Info class="size-4" />
                  <span>About</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={page.url.pathname === '/support'}>
              {#snippet child({ props })}
                <a href="/support" {...props}>
                  <LifeBuoy class="size-4" />
                  <span>Support</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Group>
    </Sidebar.Content>
  </Sidebar.Root>

  <Sidebar.Inset>
    <header
      class="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear"
    >
      <div class="flex w-full items-center gap-1 px-4">
        <SidebarToggle label="Toggle Sidebar" shortcutLabel="⌘B" />
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  class="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground [&[data-state=open]]:text-foreground"
                >
                  Lens
                  <ChevronRight class="size-3 rotate-90" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  class="flex max-h-[50vh] w-56 flex-col overflow-hidden"
                  onCloseAutoFocus={() => {
                    breadcrumbSearch = '' as Str;
                  }}
                >
                  <!-- Search input -->
                  <div class="border-b px-2 py-1.5">
                    <div class="flex items-center gap-2 rounded-md bg-muted/50 px-2">
                      <SearchIcon class="size-3 shrink-0 text-muted-foreground/60" />
                      <input
                        type="text"
                        placeholder="Search pages..."
                        class="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
                        bind:value={breadcrumbSearch}
                      />
                      {#if breadcrumbSearch.length > 0}
                        <button
                          type="button"
                          class="shrink-0 text-muted-foreground/60 hover:text-foreground"
                          onclick={() => {
                            breadcrumbSearch = '' as Str;
                          }}
                        >
                          <XIcon class="size-3" />
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- Scrollable items -->
                  {@const bcQuery = breadcrumbSearch.toLowerCase() as Str}
                  {@const bcFilteredGroups = groupedComponents.filter(
                    (g) =>
                      bcQuery.length === 0 ||
                      g.label.toLowerCase().includes(bcQuery) ||
                      g.name.toLowerCase().includes(bcQuery),
                  )}
                  {@const bcShowOverview = bcQuery.length === 0 || 'overview'.includes(bcQuery)}
                  {@const bcShowGettingStarted =
                    bcQuery.length === 0 || 'getting started'.includes(bcQuery)}
                  {@const bcShowAllComponents =
                    bcQuery.length === 0 ||
                    'all components'.includes(bcQuery) ||
                    'components list'.includes(bcQuery)}
                  {@const bcShowCategories = bcQuery.length === 0 || 'categories'.includes(bcQuery)}
                  {@const bcShowTags = bcQuery.length === 0 || 'tags'.includes(bcQuery)}
                  {@const bcShowTokens = bcQuery.length === 0 || 'design tokens'.includes(bcQuery)}
                  {@const bcShowIcons = bcQuery.length === 0 || 'icons'.includes(bcQuery)}
                  {@const bcShowWhatsNew =
                    bcQuery.length === 0 ||
                    "what's new".includes(bcQuery) ||
                    'changelog'.includes(bcQuery)}
                  {@const bcShowBrowserSupport =
                    bcQuery.length === 0 ||
                    'browser support'.includes(bcQuery) ||
                    'device support'.includes(bcQuery) ||
                    'compatibility'.includes(bcQuery)}
                  {@const bcShowStyling =
                    bcQuery.length === 0 ||
                    'styling'.includes(bcQuery) ||
                    'theming'.includes(bcQuery) ||
                    'themes'.includes(bcQuery)}
                  {@const bcShowAccessibility =
                    bcQuery.length === 0 ||
                    'accessibility'.includes(bcQuery) ||
                    'a11y'.includes(bcQuery)}
                  {@const bcShowAbout = bcQuery.length === 0 || 'about'.includes(bcQuery)}
                  {@const bcShowSupport =
                    bcQuery.length === 0 ||
                    'support'.includes(bcQuery) ||
                    'help'.includes(bcQuery) ||
                    'faq'.includes(bcQuery)}
                  {@const bcHasResults =
                    bcShowOverview ||
                    bcShowGettingStarted ||
                    bcFilteredGroups.length > 0 ||
                    bcShowAllComponents ||
                    bcShowCategories ||
                    bcShowTags ||
                    bcShowTokens ||
                    bcShowIcons ||
                    bcShowWhatsNew ||
                    bcShowBrowserSupport ||
                    bcShowStyling ||
                    bcShowAccessibility ||
                    bcShowAbout ||
                    bcShowSupport}

                  <div class="flex-1 overflow-y-auto py-1">
                    {#if !bcHasResults}
                      <!-- Empty state -->
                      <div class="flex flex-col items-center gap-1.5 py-6 text-center">
                        <SearchX class="size-4 text-muted-foreground/40" />
                        <span class="text-xs text-muted-foreground/60">No pages match</span>
                      </div>
                    {:else}
                      <!-- Overview + Getting Started (matches sidebar top group) -->
                      {#if bcShowOverview}
                        <DropdownMenu.Item>
                          {#snippet child({ props: overviewProps })}
                            <a href="/components" {...overviewProps}>
                              <Home class="size-4" />
                              Overview
                            </a>
                          {/snippet}
                        </DropdownMenu.Item>
                      {/if}
                      {#if bcShowGettingStarted}
                        <DropdownMenu.Item>
                          {#snippet child({ props: gsProps })}
                            <a href="/getting-started" {...gsProps}>
                              <BookOpen class="size-4" />
                              Getting Started
                            </a>
                          {/snippet}
                        </DropdownMenu.Item>
                      {/if}

                      <!-- Categories (matches sidebar middle group) -->
                      {#if bcFilteredGroups.length > 0}
                        {#if bcShowOverview || bcShowGettingStarted}
                          <DropdownMenu.Separator />
                        {/if}
                        <DropdownMenu.Label class="text-xs text-muted-foreground/60">
                          Categories
                        </DropdownMenu.Label>
                        {#each bcFilteredGroups as group (group.name)}
                          {@const BcIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
                          {@const bcColor =
                            CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
                          <DropdownMenu.Item>
                            {#snippet child({ props: catItemProps })}
                              <a
                                href="/components/category/{group.name}"
                                class="flex w-full items-center"
                                {...catItemProps}
                              >
                                <BcIcon class="size-4 {bcColor}" />
                                <span class="flex-1">{group.label}</span>
                                <span
                                  class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground/60"
                                >
                                  {group.components.length}
                                </span>
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/each}
                      {/if}

                      <!-- Browse pages -->
                      {#if bcShowAllComponents || bcShowCategories || bcShowTags}
                        {#if bcShowOverview || bcShowGettingStarted || bcFilteredGroups.length > 0}
                          <DropdownMenu.Separator />
                        {/if}
                        <DropdownMenu.Label class="text-xs text-muted-foreground/60">
                          Browse
                        </DropdownMenu.Label>
                        {#if bcShowAllComponents}
                          <DropdownMenu.Item>
                            {#snippet child({ props: allProps })}
                              <a href="/components/all" {...allProps}>
                                <ComponentIcon class="size-4" />
                                All Components
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowCategories}
                          <DropdownMenu.Item>
                            {#snippet child({ props: catIndexProps })}
                              <a href="/components/category" {...catIndexProps}>
                                <LayoutGrid class="size-4" />
                                Categories
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowTags}
                          <DropdownMenu.Item>
                            {#snippet child({ props: tagsProps })}
                              <a href="/components/tags" {...tagsProps}>
                                <Tag class="size-4" />
                                Tags
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                      {/if}

                      <!-- Reference pages (matches sidebar bottom group) -->
                      {#if bcShowTokens || bcShowIcons || bcShowWhatsNew || bcShowBrowserSupport || bcShowStyling || bcShowAccessibility || bcShowAbout || bcShowSupport}
                        {#if bcShowOverview || bcShowGettingStarted || bcFilteredGroups.length > 0 || bcShowAllComponents || bcShowCategories || bcShowTags}
                          <DropdownMenu.Separator />
                        {/if}
                        {#if bcShowTokens}
                          <DropdownMenu.Item>
                            {#snippet child({ props: tokensProps })}
                              <a href="/tokens" {...tokensProps}>
                                <Palette class="size-4" />
                                Design Tokens
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowIcons}
                          <DropdownMenu.Item>
                            {#snippet child({ props: icProps })}
                              <a href="/icons" {...icProps}>
                                <Shapes class="size-4" />
                                Icons
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowWhatsNew}
                          <DropdownMenu.Item>
                            {#snippet child({ props: clProps })}
                              <a href="/changelog" {...clProps}>
                                <Newspaper class="size-4" />
                                What's New
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowBrowserSupport}
                          <DropdownMenu.Item>
                            {#snippet child({ props: bsProps })}
                              <a href="/browser-support" {...bsProps}>
                                <Monitor class="size-4" />
                                Browser Support
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowStyling}
                          <DropdownMenu.Item>
                            {#snippet child({ props: stProps })}
                              <a href="/styling" {...stProps}>
                                <PaintbrushIcon class="size-4" />
                                Styling
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowAccessibility}
                          <DropdownMenu.Item>
                            {#snippet child({ props: a11yProps })}
                              <a href="/accessibility" {...a11yProps}>
                                <AccessibilityIcon class="size-4" />
                                Accessibility
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowAbout}
                          <DropdownMenu.Item>
                            {#snippet child({ props: aboutProps })}
                              <a href="/about" {...aboutProps}>
                                <Info class="size-4" />
                                About
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                        {#if bcShowSupport}
                          <DropdownMenu.Item>
                            {#snippet child({ props: supProps })}
                              <a href="/support" {...supProps}>
                                <LifeBuoy class="size-4" />
                                Support
                              </a>
                            {/snippet}
                          </DropdownMenu.Item>
                        {/if}
                      {/if}
                    {/if}
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Breadcrumb.Item>
            {#if currentCategory && CATEGORY_ORDER.includes(currentCategory)}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Link href="/components/category">Categories</Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>
                  {catLabel(currentCategory)}
                </Breadcrumb.Page>
              </Breadcrumb.Item>
            {:else if currentName && componentNames.includes(currentName)}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>{toTitle(currentName)}</Breadcrumb.Page>
              </Breadcrumb.Item>
            {:else if isTokensPage}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>Design Tokens</Breadcrumb.Page>
              </Breadcrumb.Item>
            {:else if currentPageTitle}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>{currentPageTitle}</Breadcrumb.Page>
              </Breadcrumb.Item>
            {/if}
          </Breadcrumb.List>
        </Breadcrumb.Root>
        <div class="ml-auto flex items-center gap-2">
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: searchTooltipProps })}
                <button
                  type="button"
                  class="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  {...searchTooltipProps}
                  onclick={() => {
                    searchOpen = true;
                  }}
                  aria-label="Search components"
                >
                  <SearchIcon class="size-4" />
                  <span class="hidden sm:inline">Search...</span>
                  <Kbd label="⌘K" class="ml-1" />
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content sideOffset={4}>
              <span class="flex items-center gap-1.5"
                >Search components <Kbd label="⌘K" class="border-current/20 bg-current/10" /></span
              >
            </Tooltip.Content>
          </Tooltip.Root>
          <!-- Notification center bell -->
          <Popover.Root bind:open={notifCenterOpen}>
            <Popover.Trigger>
              {#snippet child({ props: bellProps })}
                <span class="relative inline-flex">
                  <button
                    type="button"
                    class="inline-flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    {...bellProps}
                    aria-label="Notifications"
                  >
                    <Bell class="size-4" />
                  </button>
                  {#if (unreadCount as number) > 0}
                    <span class="pointer-events-none absolute -right-0.5 -top-0.5 flex size-2.5">
                      <span
                        class="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75"
                      ></span>
                      <span class="relative inline-flex size-2.5 rounded-full bg-destructive"
                      ></span>
                    </span>
                  {/if}
                </span>
              {/snippet}
            </Popover.Trigger>
            <Popover.Content align="end" sideOffset={8} class="w-80 p-0">
              <!-- Notification center header -->
              <div class="flex items-center gap-2 border-b px-4 py-3">
                <h3 class="flex-1 text-sm font-semibold">Notifications</h3>
                <!-- 3-dot menu -->
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props: notifMenuProps })}
                      <button
                        type="button"
                        class="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                        {...notifMenuProps}
                      >
                        <EllipsisVertical class="size-3.5" />
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" sideOffset={4} class="w-56">
                    <!-- Mark all read -->
                    <DropdownMenu.Item
                      disabled={(unreadCount as number) === 0}
                      onclick={markAllRead}
                    >
                      <Check class="mr-2 size-4" />
                      Mark All Read
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator />

                    <!-- Filter submenu -->
                    <DropdownMenu.Sub
                      onOpenChange={(open) => {
                        if (open) notifFilterSearchQuery = '' as Str;
                      }}
                    >
                      <DropdownMenu.SubTrigger>
                        <SearchIcon class="mr-2 size-4" />
                        Filter
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.SubContent class="w-56">
                        <div class="shrink-0 px-2 pb-1.5 pt-1">
                          <div
                            class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                          >
                            <SearchIcon
                              class="size-3 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <input
                              type="text"
                              placeholder="Search filters..."
                              class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              bind:value={notifFilterSearchQuery}
                              onkeydown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {@const filterOpts = [
                          { k: 'info', l: 'Info', d: 'General updates' },
                          { k: 'success', l: 'Success', d: 'Completions' },
                          { k: 'warning', l: 'Warning', d: 'Deprecation & issues' },
                          { k: 'error', l: 'Error', d: 'Failures' },
                        ]}
                        {@const filteredFilterOpts = notifFilterSearchQuery
                          ? filterOpts.filter(
                              (o) =>
                                o.l.toLowerCase().includes(notifFilterSearchQuery.toLowerCase()) ||
                                o.d.toLowerCase().includes(notifFilterSearchQuery.toLowerCase()),
                            )
                          : filterOpts}
                        {#if filteredFilterOpts.length === 0}
                          <div
                            class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                          >
                            <SearchX class="size-4 text-muted-foreground/40" />
                            <span class="text-xs text-muted-foreground/60">No filters match</span>
                          </div>
                        {:else}
                          {#each filteredFilterOpts as sev (sev.k)}
                            <DropdownMenu.Item
                              closeOnSelect={false}
                              onclick={() => {
                                notifDisplayFilters = {
                                  ...notifDisplayFilters,
                                  [sev.k]: !notifDisplayFilters[sev.k as NotificationType],
                                };
                              }}
                            >
                              <Check
                                class={cn(
                                  'size-4 shrink-0 transition-opacity duration-150',
                                  !notifDisplayFilters[sev.k as NotificationType] && 'opacity-0',
                                )}
                              />
                              <div class="flex min-w-0 flex-1 flex-col">
                                <span class="text-sm">{sev.l}</span>
                                <span class="text-[11px] text-muted-foreground/60">{sev.d}</span>
                              </div>
                            </DropdownMenu.Item>
                          {/each}
                        {/if}
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>

                    <!-- Show toasts toggle -->
                    <DropdownMenu.Item
                      closeOnSelect={false}
                      onclick={() => {
                        updatePreferences({ showToasts: !notifPrefs.showToasts });
                      }}
                    >
                      <Check
                        class={cn(
                          'size-4 shrink-0 transition-opacity duration-150',
                          !notifPrefs.showToasts && 'opacity-0',
                        )}
                      />
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">Show Toasts</span>
                        <span class="text-[11px] text-muted-foreground/60"
                          >Temporary popup notifications</span
                        >
                      </div>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator />

                    <!-- Clear all — destructive + 2-step -->
                    <DropdownMenu.Item
                      variant="destructive"
                      disabled={notifList.length === 0}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (confirmClearNotifs) {
                          clearAllNotifications();
                          confirmClearNotifs = false;
                          if (confirmClearNotifsTimer) clearTimeout(confirmClearNotifsTimer);
                        } else {
                          confirmClearNotifs = true;
                          confirmClearNotifsTimer = setTimeout(() => {
                            confirmClearNotifs = false;
                          }, 3000);
                        }
                      }}
                    >
                      <Trash2 class="mr-2 size-4" />
                      {confirmClearNotifs ? 'Confirm Clear All' : 'Clear All'}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
              <!-- Notification list (progressive rendering) -->
              <div
                class="max-h-80 overflow-y-auto"
                onscroll={(e) => {
                  /* Load more when scrolled near bottom */
                  const el = e.currentTarget as HTMLDivElement;
                  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100 && hasMoreNotifs) {
                    visibleNotifCount = ((visibleNotifCount as number) + 50) as Num;
                  }
                }}
              >
                {#if filteredNotifList.length === 0}
                  <div class="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <BellOff class="size-8 text-muted-foreground/30" />
                    <p class="text-xs">
                      {notifList.length === 0
                        ? 'No notifications yet'
                        : 'No matching notifications'}
                    </p>
                  </div>
                {:else}
                  {#each displayedNotifs as notif (notif.id)}
                    {@const NIcon =
                      notif.type === 'error'
                        ? CircleX
                        : notif.type === 'warning'
                          ? TriangleAlert
                          : notif.type === 'success'
                            ? CircleCheck
                            : Info}
                    {@const nColor =
                      notif.type === 'error'
                        ? 'text-red-500'
                        : notif.type === 'warning'
                          ? 'text-amber-500'
                          : notif.type === 'success'
                            ? 'text-emerald-500'
                            : 'text-blue-500'}
                    <div
                      class="group/notif flex gap-3 px-4 py-2 transition-colors hover:bg-accent/50 {notif.read
                        ? 'opacity-60'
                        : ''}"
                    >
                      <NIcon class="mt-0.5 size-4 shrink-0 {nColor}" />
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-medium {notif.read ? '' : 'text-foreground'}">
                          {notif.title}
                        </p>
                        {#if notif.message}
                          <p class="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                            {notif.message}
                          </p>
                        {/if}
                        <div class="mt-1 flex items-center gap-2">
                          <span class="text-[10px] text-muted-foreground/60"
                            >{relativeTime(notif.timestamp)}</span
                          >
                          {#if notif.actionHref}
                            <a
                              href={notif.actionHref}
                              class="text-[10px] font-medium text-primary hover:underline"
                            >
                              {notif.actionLabel ?? 'View'}
                            </a>
                          {/if}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground/30 opacity-0 transition-opacity hover:text-foreground group-hover/notif:opacity-100"
                        onclick={() => removeNotification(notif.id)}
                        aria-label="Dismiss notification"
                      >
                        <XIcon class="size-3" />
                      </button>
                    </div>
                  {/each}
                  {#if hasMoreNotifs}
                    <div class="flex justify-center py-3">
                      <span class="text-[10px] text-muted-foreground/40">Scroll for more…</span>
                    </div>
                  {/if}
                {/if}
              </div>
              <!-- Footer -->
              {#if filteredNotifList.length > 0}
                <div class="border-t px-4 py-2 text-center">
                  <span class="text-[11px] text-muted-foreground/60"
                    >{filteredNotifList.length} of {notifList.length} notification{notifList.length ===
                    1
                      ? ''
                      : 's'}</span
                  >
                </div>
              {/if}
            </Popover.Content>
          </Popover.Root>
          <ModeToggle
            mode={currentMode}
            {setMode}
            labels={{
              toggleTheme: 'Toggle theme',
              toggleMode: 'Toggle mode',
              light: 'Light',
              dark: 'Dark',
              system: 'System',
            }}
          />
        </div>
      </div>
    </header>
    <main class="flex min-w-0 flex-1 flex-col select-text">
      {@render children()}
    </main>
  </Sidebar.Inset>
  <CommandSearch
    items={globalSearchItems}
    placeholder="Search lens..."
    emptyText="No matching results."
    bind:open={searchOpen}
  />
</Sidebar.Provider>

<Toaster
  richColors
  closeButton
  position="bottom-right"
  toastOptions={{
    class:
      '!border !border-border shadow-lg !bg-card !text-foreground [&_[data-close-button]]:!bg-card [&_[data-close-button]]:!text-muted-foreground [&_[data-close-button]]:!border-border [&_[data-close-button]:hover]:!bg-accent [&_[data-close-button]:hover]:!text-accent-foreground',
  }}
/>
