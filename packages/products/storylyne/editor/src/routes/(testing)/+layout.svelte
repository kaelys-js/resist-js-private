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
  import type { Str } from '@/schemas/common';
  import type { LensMeta, CategoryGroup, LensExample } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import type { SearchItem } from '@/ui/search-autocomplete/search-item.js';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    findPrimaryKey,
    extractComponentDescription,
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
  import ComponentIcon from '@lucide/svelte/icons/component';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Palette from '@lucide/svelte/icons/palette';
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
                          <DropdownMenu.Item onclick={() => handleSidebarExport(item.id)}>
                            {#if sidebarExportFeedback === item.id}
                              <Check class="mr-2 size-4 text-green-500" />
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
          <Collapsible.Content>
            <Sidebar.GroupContent>
              {#each groupedComponents as group (group.name)}
                <Collapsible.Root
                  bind:open={sidebarCategoryOpen[group.name]}
                  class="group/category mb-0.5"
                >
                  <Collapsible.Trigger
                    class="flex w-full items-center gap-1.5 rounded-md px-3 py-1 transition-colors hover:bg-accent/50"
                  >
                    <ChevronRight
                      class="size-3 text-muted-foreground/50 transition-transform group-data-[state=open]/category:rotate-90"
                    />
                    <span
                      class="text-xs font-medium uppercase tracking-wider text-muted-foreground/60"
                      >{group.label}</span
                    >
                    <Badge
                      variant="secondary"
                      class="ml-auto h-5 rounded px-1.5 text-[11px] leading-none"
                      >{group.components.length}</Badge
                    >
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <Sidebar.Menu class="pl-4">
                      {#each group.components as name (name)}
                        {@const itemMeta = metaByName.get(name)}
                        <Sidebar.MenuItem>
                          <Tooltip.Root delayDuration={400}>
                            <Tooltip.Trigger>
                              {#snippet child({ props: tooltipProps })}
                                <Sidebar.MenuButton
                                  isActive={currentName === name}
                                  {...tooltipProps}
                                >
                                  {#snippet child({ props })}
                                    <a href="/components/{name}" {...props}>
                                      <ComponentIcon class="size-4" />
                                      <span>{toTitle(name)}</span>
                                    </a>
                                  {/snippet}
                                </Sidebar.MenuButton>
                              {/snippet}
                            </Tooltip.Trigger>
                            {#if itemMeta?.description}
                              <Tooltip.Content side="right" sideOffset={8} class="max-w-64">
                                <p class="text-xs">{itemMeta.description}</p>
                                {#if itemMeta.tags.length > 0}
                                  <div class="mt-1 flex flex-wrap gap-1">
                                    {#each itemMeta.tags as tag (tag)}
                                      <span
                                        class="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px]"
                                        >{tag}</span
                                      >
                                    {/each}
                                  </div>
                                {/if}
                              </Tooltip.Content>
                            {/if}
                          </Tooltip.Root>
                        </Sidebar.MenuItem>
                      {/each}
                    </Sidebar.Menu>
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
              {#if currentName || isTokensPage}
                <Breadcrumb.Link href="/components">Lens</Breadcrumb.Link>
              {:else}
                <Breadcrumb.Page>Lens</Breadcrumb.Page>
              {/if}
            </Breadcrumb.Item>
            {#if currentName}
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
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            onclick={() => {
              searchOpen = true;
            }}
            aria-label="Search components"
          >
            <SearchIcon class="size-4" />
            <span class="hidden sm:inline">Search...</span>
            <Kbd label="⌘K" class="ml-1" />
          </button>
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
