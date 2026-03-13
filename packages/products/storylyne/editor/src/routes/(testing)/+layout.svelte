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
  import { fade, slide } from 'svelte/transition';
  import { untrack, type Component } from 'svelte';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Palette from '@lucide/svelte/icons/palette';
  import TextCursorInput from '@lucide/svelte/icons/text-cursor-input';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Layers2 from '@lucide/svelte/icons/layers-2';
  import Compass from '@lucide/svelte/icons/compass';
  import Eye from '@lucide/svelte/icons/eye';
  import Wrench from '@lucide/svelte/icons/wrench';
  import Microscope from '@lucide/svelte/icons/microscope';
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

  const { children } = $props();

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
        metaByName.set(dir, { ...result.data, tags: [...result.data.tags] });
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
  const categoryOrder: Str[] = [
    'form',
    'layout',
    'overlay',
    'navigation',
    'display',
    'utility',
    'lens',
  ];

  const groupedComponents: CategoryGroup[] = categoryOrder
    .map(
      (cat: Str): CategoryGroup => ({
        name: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        components: componentNames.filter((n: Str): boolean => {
          const m: LensMeta | undefined = metaByName.get(n);
          return (m?.category ?? 'display') === cat;
        }),
      }),
    )
    .filter((g: CategoryGroup): boolean => g.components.length > 0);

  /** Category-to-icon mapping for visual differentiation in sidebar triggers. */
  const CATEGORY_ICONS: Record<Str, Component> = {
    form: TextCursorInput,
    layout: LayoutGrid,
    overlay: Layers2,
    navigation: Compass,
    display: Eye,
    utility: Wrench,
    lens: Microscope,
  };

  /** Category-to-color mapping for sidebar component item icons. */
  const CATEGORY_COLORS: Record<Str, Str> = {
    form: 'text-blue-600 dark:text-blue-400' as Str,
    layout: 'text-purple-600 dark:text-purple-400' as Str,
    overlay: 'text-amber-600 dark:text-amber-400' as Str,
    navigation: 'text-emerald-600 dark:text-emerald-400' as Str,
    display: 'text-rose-600 dark:text-rose-400' as Str,
    utility: 'text-slate-600 dark:text-slate-400' as Str,
    lens: 'text-primary' as Str,
  };

  /** Short description per category for sidebar header tooltips. */
  const CATEGORY_DESCRIPTIONS: Record<Str, Str> = {
    form: 'Input controls, selectors, and form elements' as Str,
    layout: 'Structural components for page and content layout' as Str,
    overlay: 'Modals, dialogs, popovers, and floating UI' as Str,
    navigation: 'Menus, breadcrumbs, tabs, and wayfinding' as Str,
    display: 'Visual content presentation and data display' as Str,
    utility: 'Utility primitives and helper components' as Str,
    lens: 'Lens documentation system components' as Str,
  };

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
            href: `${baseHref}#props`,
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

  /** Current component name from the URL params. */
  const currentName: Str = $derived(page.params.name ?? '');

  /** Whether the current page is the tokens viewer. */
  const isTokensPage: boolean = $derived(page.url.pathname === '/tokens');

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
  $effect(() => {
    if (!currentName || currentName.length === 0) return;
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
  };

  /** Status badge labels. */
  const STATUS_LABELS: Record<LensStatus, Str> = {
    new: 'New' as Str,
    updated: 'Updated' as Str,
    deprecated: 'Deprecated' as Str,
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
    // Scroll into view after DOM updates
    setTimeout((): void => {
      const activeEl: HTMLElement | null = document.querySelector(
        '[data-sidebar="menu-button"][data-active="true"]',
      );
      activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 100);
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

  /** Whether the top-level "Components" collapsible group is open. */
  let sidebarComponentsOpen: boolean = $state(true);

  /** Per-category collapsible open state (keyed by category name, default open). */
  let sidebarCategoryOpen: Record<Str, boolean> = $state(
    Object.fromEntries(categoryOrder.map((cat: Str): [Str, boolean] => [cat, true])),
  );

  /**
   * Expand all sidebar collapsible sections.
   */
  function expandAllSidebar(): void {
    sidebarComponentsOpen = true;
    for (const cat of categoryOrder) {
      sidebarCategoryOpen[cat] = true;
    }
  }

  /**
   * Collapse all sidebar collapsible sections.
   */
  function collapseAllSidebar(): void {
    sidebarComponentsOpen = false;
    for (const cat of categoryOrder) {
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
      description: 'Structured data format',
      ext: '',
    },
    {
      id: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: FileText,
      category: 'Clipboard',
      description: 'Formatted table for docs',
      ext: '',
    },
    {
      id: 'download-json',
      label: 'Download JSON',
      icon: Download,
      category: 'File',
      description: 'Structured data file',
      ext: '.json',
    },
    {
      id: 'download-markdown',
      label: 'Download Markdown',
      icon: Download,
      category: 'File',
      description: 'Formatted doc file',
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
      categories: categoryOrder.filter((cat: Str) => groupedComponents.some((g) => g.name === cat)),
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
        <Badge
          variant="secondary"
          class="h-5 rounded-full px-1.5 text-[10px] leading-none tabular-nums"
          >{componentNames.length}</Badge
        >
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
                    <p class="mb-1.5 text-[11px] font-medium text-muted-foreground">
                      Component index · {componentNames.length} components
                    </p>
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
              <DropdownMenu.Item onclick={expandAllSidebar}>
                <ChevronsUpDown class="mr-2 size-4" />
                Expand All
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={collapseAllSidebar}>
                <ChevronsDownUp class="mr-2 size-4" />
                Collapse All
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>
    </Sidebar.Header>
    <Sidebar.Content>
      <!-- Overview link -->
      <Sidebar.Group>
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
        </Sidebar.Menu>
      </Sidebar.Group>
      <!-- Pinned components -->
      {#if pinnedComponents.size > 0}
        <Sidebar.Group>
          <Sidebar.GroupLabel class="flex items-center text-xs">
            <Star class="mr-1 size-3" />
            <span class="flex-1">Pinned</span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class="ml-auto rounded-sm p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                <EllipsisVertical class="size-3.5" />
                <span class="sr-only">Pinned options</span>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-40">
                <DropdownMenu.Item onclick={clearAllPinned}>
                  <Trash2 class="mr-2 size-4" />
                  Clear all pinned
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each [...pinnedComponents] as name (name)}
                {@const pinMeta = metaByName.get(name)}
                {@const PinIcon = CATEGORY_ICONS[pinMeta?.category ?? 'display'] ?? ComponentIcon}
                {@const pinColor =
                  CATEGORY_COLORS[pinMeta?.category ?? 'display'] ??
                  ('text-muted-foreground' as Str)}
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
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      {/if}
      <!-- Recently viewed -->
      {#if recentComponents.length > 0}
        <Sidebar.Group>
          <Sidebar.GroupLabel class="flex items-center text-xs">
            <Clock class="mr-1 size-3" />
            <span class="flex-1">Recent</span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class="ml-auto rounded-sm p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                <EllipsisVertical class="size-3.5" />
                <span class="sr-only">Recent options</span>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" class="w-40">
                <DropdownMenu.Item onclick={clearRecent}>
                  <Trash2 class="mr-2 size-4" />
                  Clear recent
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Sidebar.GroupLabel>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {#each recentComponents
                .filter((n) => !pinnedComponents.has(n))
                .slice(0, 5) as name (name)}
                {@const recMeta = metaByName.get(name)}
                {@const RecIcon = CATEGORY_ICONS[recMeta?.category ?? 'display'] ?? ComponentIcon}
                {@const recColor =
                  CATEGORY_COLORS[recMeta?.category ?? 'display'] ??
                  ('text-muted-foreground' as Str)}
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
              {/each}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      {/if}
      <Collapsible.Root bind:open={sidebarComponentsOpen} class="group/collapsible">
        <Sidebar.Group>
          <Sidebar.GroupLabel class="text-sm">
            {#snippet child({ props })}
              <Collapsible.Trigger {...props}>
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
              {#if sidebarFilter.length > 0 && filteredGroupedComponents.length === 0}
                <div class="flex flex-col items-center gap-1 px-2 py-4 text-center">
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No components match</span>
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
                            class="text-xs font-medium uppercase tracking-wider text-muted-foreground/60"
                            >{group.label}</span
                          >
                          {@const compatCount = countCompatible(group)}
                          <Badge
                            variant="secondary"
                            class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none {compatCount <
                            group.components.length
                              ? 'text-amber-600 dark:text-amber-400'
                              : ''}">{compatCount}/{group.components.length}</Badge
                          >
                        </Collapsible.Trigger>
                      {/snippet}
                    </Tooltip.Trigger>
                    {#if CATEGORY_DESCRIPTIONS[group.name]}
                      <Tooltip.Content side="right" sideOffset={8} class="max-w-56">
                        <p class="text-xs">{CATEGORY_DESCRIPTIONS[group.name]}</p>
                      </Tooltip.Content>
                    {/if}
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
                            <Tooltip.Root delayDuration={400}>
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
                                        class="{props.class ?? ''} {isIncompat ? 'opacity-50' : ''}"
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
                              <Tooltip.Content side="right" sideOffset={8} class="max-w-72">
                                {#if itemMeta?.description}
                                  <p class="text-xs">{itemMeta.description}</p>
                                {/if}
                                {#if itemMeta?.tags && itemMeta.tags.length > 0}
                                  <div class="mt-1 flex flex-wrap gap-1">
                                    {#each itemMeta.tags as tag (tag)}
                                      <span
                                        class="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px]"
                                        >{tag}</span
                                      >
                                    {/each}
                                  </div>
                                {/if}
                                {#if isIncompat && itemCompat}
                                  <div class="mt-1.5 border-t border-border pt-1.5">
                                    <p
                                      class="mb-1 text-[10px] font-semibold text-popover-foreground"
                                    >
                                      {itemCompat.violations.length} violation{itemCompat.violations
                                        .length === 1
                                        ? ''
                                        : 's'}
                                    </p>
                                    <ul class="space-y-0.5">
                                      {#each itemCompat.violations.slice(0, 5) as violation, i (i)}
                                        <li class="text-[10px] text-popover-foreground/90">
                                          {#if (violation.rule as number) > 0}
                                            <span class="font-mono text-popover-foreground/60"
                                              >R{violation.rule}</span
                                            >
                                          {/if}
                                          {violation.message}
                                        </li>
                                      {/each}
                                      {#if itemCompat.violations.length > 5}
                                        <li class="text-[10px] text-popover-foreground/60">
                                          +{itemCompat.violations.length - 5} more...
                                        </li>
                                      {/if}
                                    </ul>
                                  </div>
                                {/if}
                              </Tooltip.Content>
                            </Tooltip.Root>
                            <Sidebar.MenuAction>
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
      <!-- Design Tokens link -->
      <Sidebar.Group>
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
                      >{tokenCount}</Badge
                    >
                  {/if}
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
                <DropdownMenu.Content align="start" sideOffset={8} class="w-52">
                  <DropdownMenu.Item>
                    {#snippet child({ props: overviewProps })}
                      <a href="/components" {...overviewProps}>
                        <Home class="size-4" />
                        Overview
                      </a>
                    {/snippet}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Label class="text-xs text-muted-foreground/60">
                    Categories
                  </DropdownMenu.Label>
                  {#each groupedComponents as group (group.name)}
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
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item>
                    {#snippet child({ props: tokensProps })}
                      <a href="/tokens" {...tokensProps}>
                        <Palette class="size-4" />
                        Design Tokens
                      </a>
                    {/snippet}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Breadcrumb.Item>
            {#if currentCategory}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>
                  {currentCategory.charAt(0).toUpperCase()}{currentCategory.slice(1)}
                </Breadcrumb.Page>
              </Breadcrumb.Item>
            {:else if currentName}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>{toTitle(currentName)}</Breadcrumb.Page>
              </Breadcrumb.Item>
            {:else if isTokensPage}
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>Design Tokens</Breadcrumb.Page>
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
