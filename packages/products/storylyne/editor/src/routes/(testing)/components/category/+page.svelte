<script lang="ts">
  /**
   * Categories index page — browse all component categories with search,
   * filtering, sort, and grid/list view.
   *
   * Matches the Icons page UX pattern: sticky header, 3-dot dropdown with
   * Export/Customize/Reset, inline search, category filter chips.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { LensMeta, CategoryGroup } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    type LensCompatibility,
  } from '@/ui/lens/lens-utils.js';
  import { log } from '@/utils/core/logger';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { getContext, type Component } from 'svelte';
  import {
    CATEGORY_ORDER,
    CATEGORY_ICONS,
    CATEGORY_COLORS,
    CATEGORY_DESCRIPTIONS,
    CATEGORY_BG_HOVER,
    categoryLabel as catLabel,
  } from '$lib/config/lens-categories';
  import Check from '@lucide/svelte/icons/check';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import TagIcon from '@lucide/svelte/icons/tag';
  import X from '@lucide/svelte/icons/x';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import DownloadIcon from '@lucide/svelte/icons/download';

  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import Input from '@/ui/input/input.svelte';
  import { storageKey } from '$lib/config/app-meta';

  /* ------------------------------------------------------------------ */
  /*  Glob-based data                                                    */
  /* ------------------------------------------------------------------ */

  /** All .svelte files in @/ui for component directory discovery. */
  const allModules: Record<Str, unknown> = import.meta.glob('@/ui/*/*.svelte');

  /** Eager lens.ts metadata for category, description, tags. */
  const lensMetaModules: Record<Str, { meta?: LensMeta; default?: unknown; examples?: unknown }> =
    import.meta.glob('@/ui/*/lens.ts', { import: '*', eager: true }) as Record<
      Str,
      { meta?: LensMeta; default?: unknown; examples?: unknown }
    >;

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

  /* ------------------------------------------------------------------ */
  /*  Lens compatibility data from parent layout (via Svelte context)    */
  /* ------------------------------------------------------------------ */

  /** Lens compatibility results per component, set by +layout.svelte. */
  const compatByName: Map<Str, LensCompatibility> = getContext('lens-compat-by-name');

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  /** Current view mode for category display. */
  let viewMode: 'grid' | 'compact' | 'list' = $state('grid');

  /** Search query for filtering categories and components. */
  let searchQuery: Str = $state('' as Str);

  /** Active category filters. */
  let activeCategories: Str[] = $state([]);

  /** Active sort field (empty = default order). */
  let sortField: Str = $state('' as Str);

  /** Sort direction. */
  let sortDir: 'asc' | 'desc' = $state('asc');

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Two-step reset confirmation. */
  let confirmingReset: Bool = $state(false as Bool);
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Human-readable label for the current view mode. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'compact') return 'Dense' as Str;
    if (viewMode === 'list') return 'List' as Str;
    return 'Grid' as Str;
  });

  /** Human-readable label for the active sort, or empty when default. */
  const sortLabel: Str = $derived.by((): Str => {
    if (sortField === 'name') return 'Name' as Str;
    if (sortField === 'count') return 'Count' as Str;
    if (sortField === 'compatibility') return 'Compat' as Str;
    return '' as Str;
  });

  // Restore view mode from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(storageKey('lens-view-mode'));
      if (stored === 'list' || stored === 'grid' || stored === 'compact') {
        viewMode = stored;
      }
    } catch {
      /* localStorage unavailable (SSR/incognito) — default grid is fine */
    }
  });

  // Persist view mode on change
  $effect(() => {
    try {
      localStorage.setItem(storageKey('lens-view-mode'), viewMode);
    } catch {
      /* localStorage unavailable (SSR/incognito) — non-critical */
    }
  });

  /* ------------------------------------------------------------------ */
  /*  Filtered + sorted categories                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Compute a raw ascending sort value for two category groups.
   *
   * @param a - First group
   * @param b - Second group
   * @returns Numeric comparison value
   */
  function getSortValue(a: CategoryGroup, b: CategoryGroup): Num {
    if (sortField === 'name') return a.label.localeCompare(b.label) as Num;
    if (sortField === 'count') {
      return (a.components.length - b.components.length) as Num;
    }
    if (sortField === 'compatibility') {
      const aCompat: Num = (a.components.filter(
        (n: Str): boolean => compatByName.get(n)?.compatible === true,
      ).length / Math.max(1, a.components.length)) as Num;
      const bCompat: Num = (b.components.filter(
        (n: Str): boolean => compatByName.get(n)?.compatible === true,
      ).length / Math.max(1, b.components.length)) as Num;
      return (aCompat - bCompat) as Num;
    }
    return 0 as Num;
  }

  /** Categories filtered by search query and active category filters. */
  const filteredGroups: CategoryGroup[] = $derived.by((): CategoryGroup[] => {
    const q: Str = searchQuery.trim().toLowerCase() as Str;
    let groups: CategoryGroup[] = groupedComponents;

    // Filter to active categories if any selected
    if (activeCategories.length > 0) {
      groups = groups.filter((g: CategoryGroup): boolean => activeCategories.includes(g.name));
    }

    // Filter by search query (match category name OR component names within)
    if (q) {
      groups = groups
        .map((g: CategoryGroup): CategoryGroup => {
          const nameMatch: boolean = g.label.toLowerCase().includes(q as string);
          const matchedComponents: Str[] = g.components.filter((n: Str): boolean =>
            toTitle(n)
              .toLowerCase()
              .includes(q as string),
          );
          if (nameMatch) return g;
          if (matchedComponents.length > 0) {
            return { ...g, components: matchedComponents };
          }
          return { ...g, components: [] };
        })
        .filter(
          (g: CategoryGroup): boolean =>
            g.components.length > 0 || g.label.toLowerCase().includes(q as string),
        );
    }

    // Sort
    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      groups = [...groups].toSorted((a: CategoryGroup, b: CategoryGroup): Num => {
        const raw: Num = getSortValue(a, b);
        return (raw * mul) as Num;
      });
    }

    return groups;
  });

  /** Total filtered component count across all visible categories. */
  const filteredComponentCount: Num = $derived(
    filteredGroups.reduce(
      (sum: Num, g: CategoryGroup): Num => (sum + g.components.length) as Num,
      0 as Num,
    ),
  );

  /** Dynamic subtitle text. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery.trim() || activeCategories.length > 0) {
      return `${filteredComponentCount} components across ${filteredGroups.length} categories` as Str;
    }
    return `${componentNames.length} components across ${groupedComponents.length} categories` as Str;
  });

  /** Whether any customization is active. */
  const isCustomized: boolean = $derived(viewMode !== 'grid' || sortField !== '');

  /* ------------------------------------------------------------------ */
  /*  Export                                                              */
  /* ------------------------------------------------------------------ */

  /** Export menu item descriptor. */
  type ExportItem = {
    /** Unique identifier. */
    id: Str;
    /** Display label. */
    label: Str;
    /** Lucide icon component. */
    icon: typeof ClipboardCopy;
    /** Grouping category. */
    category: Str;
    /** Short description. */
    description: Str;
    /** File extension for downloads. */
    ext: Str;
  };

  /** Page-level export menu items. */
  const PAGE_EXPORT_ITEMS: ExportItem[] = [
    {
      id: 'copy-json' as Str,
      label: 'Copy as JSON' as Str,
      icon: ClipboardCopy,
      category: 'Clipboard' as Str,
      description: 'Component list with categories' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-markdown' as Str,
      label: 'Copy as Markdown' as Str,
      icon: FileText,
      category: 'Clipboard' as Str,
      description: 'Formatted table for docs' as Str,
      ext: '' as Str,
    },
    {
      id: 'download-json' as Str,
      label: 'Download JSON' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Structured data file' as Str,
      ext: '.json' as Str,
    },
    {
      id: 'download-markdown' as Str,
      label: 'Download Markdown' as Str,
      icon: DownloadIcon,
      category: 'File' as Str,
      description: 'Formatted doc file' as Str,
      ext: '.md' as Str,
    },
  ];

  /** Unique export categories. */
  const PAGE_EXPORT_CATEGORIES: Str[] = [
    ...new Set(PAGE_EXPORT_ITEMS.map((p: ExportItem): Str => p.category)),
  ];

  /** Search query for export menu filtering. */
  let exportSearchQuery: Str = $state('' as Str);

  /** Export items filtered by search query. */
  const filteredExportItems: ExportItem[] = $derived(
    exportSearchQuery.length === 0
      ? PAGE_EXPORT_ITEMS
      : PAGE_EXPORT_ITEMS.filter((p: ExportItem): boolean => {
          const q: Str = exportSearchQuery.toLowerCase() as Str;
          return (
            p.label.toLowerCase().includes(q as string) ||
            p.description.toLowerCase().includes(q as string) ||
            p.category.toLowerCase().includes(q as string)
          );
        }),
  );

  /** Unique export categories present after filtering. */
  const filteredExportCategories: Str[] = $derived([
    ...new Set(filteredExportItems.map((p: ExportItem): Str => p.category)),
  ]);

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Toggle a category filter chip on or off.
   *
   * @param cat - Category name to toggle
   */
  function toggleCategory(cat: Str): void {
    if (activeCategories.includes(cat)) {
      activeCategories = activeCategories.filter((c: Str): boolean => c !== cat);
    } else {
      activeCategories = [...activeCategories, cat];
    }
  }

  /** Two-step reset handler (matches Icons page pattern). */
  function handleReset(): void {
    if (confirmingReset) {
      viewMode = 'grid';
      sortField = '' as Str;
      sortDir = 'asc';
      searchQuery = '' as Str;
      activeCategories = [];
      confirmingReset = false as Bool;
      if (confirmResetTimer) clearTimeout(confirmResetTimer);
    } else {
      confirmingReset = true as Bool;
      confirmResetTimer = setTimeout((): void => {
        confirmingReset = false as Bool;
      }, 3000);
    }
  }

  /**
   * Handle export action from the dropdown menu.
   *
   * @param itemId - Export item identifier (e.g., 'copy-json', 'download-markdown')
   */
  function handleExport(itemId: Str): void {
    const data: Array<{ category: Str; components: Str[] }> = groupedComponents.map(
      (g: CategoryGroup): { category: Str; components: Str[] } => ({
        category: g.label,
        components: g.components.map(toTitle),
      }),
    );

    if (itemId === 'copy-json') {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } else if (itemId === 'copy-markdown') {
      const md: Str = groupedComponents
        .map(
          (g: CategoryGroup): Str =>
            `## ${g.label}\n${g.components.map((n: Str): Str => `- ${toTitle(n)}` as Str).join('\n')}` as Str,
        )
        .join('\n\n') as Str;
      navigator.clipboard.writeText(md);
    } else if (itemId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob) as Str;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'lens-categories.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (itemId === 'download-markdown') {
      const md: Str = groupedComponents
        .map(
          (g: CategoryGroup): Str =>
            `## ${g.label}\n${g.components.map((n: Str): Str => `- ${toTitle(n)}` as Str).join('\n')}` as Str,
        )
        .join('\n\n') as Str;
      const blob: Blob = new Blob([md], { type: 'text/markdown' });
      const url: Str = URL.createObjectURL(blob) as Str;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'lens-categories.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
</script>

<div class="w-full">
  <!-- Sticky header + controls (matches Icons page pattern) -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <LayoutGrid class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Categories</h1>
        <p class="text-sm text-muted-foreground">{headerSubtitle}</p>
      </div>

      <!-- Page-level three-dot menu -->
      <DropdownMenu.Root>
        <Tooltip.Provider>
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
                      <span class="sr-only">Page options</span>
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" sideOffset={4}>Page options</Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
        <DropdownMenu.Content align="end" sideOffset={4}>
          <!-- Export submenu -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <DownloadIcon class="mr-2 size-4" />
              Export
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-64">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search exports..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={exportSearchQuery}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {#if filteredExportItems.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No exports match</span>
                </div>
              {:else}
                {#each filteredExportCategories as exportCat (exportCat)}
                  <DropdownMenu.Label
                    class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                  >
                    {exportCat}
                  </DropdownMenu.Label>
                  {#each filteredExportItems.filter((p) => p.category === exportCat) as item (item.id)}
                    <DropdownMenu.Item onclick={() => handleExport(item.id)}>
                      <item.icon class="mr-2 size-4" />
                      <div class="flex min-w-0 flex-1 flex-col">
                        <span class="text-sm">{item.label}</span>
                        <span class="text-[11px] text-muted-foreground/60">{item.description}</span>
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
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- View Mode submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open) => {
              if (open) viewSearchQuery = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <LayoutGrid class="mr-2 size-4" />
              View Mode
              <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]"
                >{viewModeLabel}</span
              >
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search views..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={viewSearchQuery}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {@const viewOpts = [
                { v: 'grid', l: 'Grid', d: 'Category cards with components' },
                { v: 'compact', l: 'Dense Grid', d: 'Names and counts only' },
                { v: 'list', l: 'List', d: 'Compact rows with counts' },
              ]}
              {@const filteredViewOpts = viewSearchQuery
                ? viewOpts.filter(
                    (o) =>
                      o.l.toLowerCase().includes(viewSearchQuery.toLowerCase()) ||
                      o.d.toLowerCase().includes(viewSearchQuery.toLowerCase()),
                  )
                : viewOpts}
              {#if filteredViewOpts.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No views match</span>
                </div>
              {:else}
                {#each filteredViewOpts as opt (opt.v)}
                  <DropdownMenu.Item
                    closeOnSelect={false}
                    onclick={() => {
                      viewMode = opt.v as 'grid' | 'compact' | 'list';
                    }}
                  >
                    <Check
                      class={cn(
                        'size-4 shrink-0 transition-opacity duration-150',
                        viewMode !== opt.v && 'opacity-0',
                      )}
                    />
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="text-sm">{opt.l}</span>
                      <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                    </div>
                  </DropdownMenu.Item>
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <!-- Sort By submenu -->
          <DropdownMenu.Sub
            onOpenChange={(open) => {
              if (open) sortSearchQuery = '' as Str;
            }}
          >
            <DropdownMenu.SubTrigger>
              <ArrowUpDown class="mr-2 size-4" />
              Sort By
              {#if sortLabel}
                <span class="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]"
                  >{sortLabel}</span
                >
              {/if}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <div class="shrink-0 px-2 pb-1.5 pt-1">
                <div
                  class="flex items-center gap-2 rounded-md border bg-transparent px-2 py-1 text-sm"
                >
                  <SearchIcon class="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search sort..."
                    class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    bind:value={sortSearchQuery}
                    onkeydown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {@const sortOpts = [
                { v: 'name', l: 'Name', d: 'Alphabetical' },
                { v: 'count', l: 'Component Count', d: 'By count' },
                { v: 'compatibility', l: 'Compatibility', d: 'By compliance' },
              ]}
              {@const filteredSortOpts = sortSearchQuery
                ? sortOpts.filter(
                    (o) =>
                      o.l.toLowerCase().includes(sortSearchQuery.toLowerCase()) ||
                      o.d.toLowerCase().includes(sortSearchQuery.toLowerCase()),
                  )
                : sortOpts}
              {#if filteredSortOpts.length === 0}
                <div
                  class="flex flex-col items-center gap-1.5 py-6 text-center text-muted-foreground"
                >
                  <SearchX class="size-4 text-muted-foreground/40" />
                  <span class="text-xs text-muted-foreground/60">No sort options match</span>
                </div>
              {:else}
                {#each filteredSortOpts as opt (opt.v)}
                  <DropdownMenu.Item
                    closeOnSelect={false}
                    onclick={() => {
                      if (sortField === opt.v) {
                        if (sortDir === 'asc') {
                          sortDir = 'desc';
                        } else {
                          sortField = '' as Str;
                          sortDir = 'asc';
                        }
                      } else {
                        sortField = opt.v as Str;
                        sortDir = 'asc';
                      }
                    }}
                  >
                    {#if sortField === opt.v && sortDir === 'asc'}
                      <ArrowUp class="size-4 shrink-0" />
                    {:else if sortField === opt.v && sortDir === 'desc'}
                      <ArrowDown class="size-4 shrink-0" />
                    {:else}
                      <ArrowUpDown class="size-4 shrink-0 opacity-30" />
                    {/if}
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="text-sm">{opt.l}</span>
                      <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                    </div>
                  </DropdownMenu.Item>
                {/each}
              {/if}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

          <!-- Reset -->
          <DropdownMenu.Item
            variant="destructive"
            disabled={!isCustomized}
            onSelect={(e) => {
              e.preventDefault();
              handleReset();
            }}
          >
            <Trash2 class="mr-2 size-4" />
            {confirmingReset ? 'Confirm Reset' : 'Reset to defaults'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Search -->
    <div class="relative">
      <SearchIcon
        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="text"
        placeholder="Search {componentNames.length} components across {groupedComponents.length} categories..."
        class="pl-10 pr-8"
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          onclick={() => {
            searchQuery = '' as Str;
          }}
          aria-label="Clear search"
        >
          <X class="size-4" />
        </button>
      {/if}
    </div>

    <!-- Category filter chips -->
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        class={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          activeCategories.length === 0
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
        onclick={() => {
          activeCategories = [];
        }}
      >
        All
      </button>
      {#each groupedComponents as group (group.name)}
        {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
        {@const isActive = activeCategories.includes(group.name)}
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props })}
                <button
                  {...props}
                  type="button"
                  class={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                  onclick={() => toggleCategory(group.name)}
                >
                  <CatIcon class="size-3 shrink-0 opacity-60" />
                  {group.label}
                  <span class="opacity-60">{group.components.length}</span>
                  {#if isActive}
                    <X class="size-3 opacity-70" />
                  {/if}
                </button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content
              side="bottom"
              class="max-h-64 max-w-xs overflow-y-auto p-3"
              portalProps={{ disabled: true }}
            >
              <div class="flex flex-col gap-0.5">
                {#each group.components as comp (comp)}
                  <a
                    href="/components/{comp}"
                    class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
      {/each}
      {#if activeCategories.length > 0}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            activeCategories = [];
          }}
        >
          <X class="size-3" />
          Clear selection
        </button>
      {/if}
    </div>
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
    {#if filteredGroups.length === 0}
      <!-- Empty search state -->
      <div
        class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card py-16 text-center"
      >
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground/60">No matching categories</p>
          <p class="max-w-64 text-xs leading-relaxed text-muted-foreground/40">
            Try a different search term or clear filters
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            searchQuery = '' as Str;
            activeCategories = [];
          }}
        >
          <X class="size-3" />
          Clear filters
        </button>
      </div>
    {:else if viewMode === 'grid'}
      <!-- Grid view -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredGroups as group (group.name)}
          {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
          {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
          {@const catBg = CATEGORY_BG_HOVER[group.name] ?? ('hover:border-border' as Str)}
          {@const catDesc = CATEGORY_DESCRIPTIONS[group.name] ?? ('' as Str)}
          <div
            class={cn('flex flex-col gap-3 rounded-lg border bg-card p-4 transition-all', catBg)}
          >
            <a
              href="/components/category/{group.name}"
              class="group/cat flex items-start justify-between"
            >
              <div class="flex items-center gap-2.5">
                <div class={cn('flex size-9 items-center justify-center rounded-lg bg-muted/50')}>
                  <CatIcon class="size-5 {catColor}" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold group-hover/cat:text-primary">
                    {group.label}
                  </h3>
                  <p class="text-xs text-muted-foreground">
                    {group.components.length} components
                  </p>
                </div>
              </div>
              <ArrowRight
                class="size-4 text-muted-foreground/30 transition-transform group-hover/cat:translate-x-0.5 group-hover/cat:text-primary"
              />
            </a>
            {#if catDesc}
              <p class="text-xs leading-relaxed text-muted-foreground">{catDesc}</p>
            {/if}
            <!-- Component list — each name links to its page -->
            <div class="flex flex-wrap gap-1">
              {#each group.components.slice(0, 8) as name (name)}
                <a
                  href="/components/{name}"
                  class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >{toTitle(name)}</a
                >
              {/each}
              {#if group.components.length > 8}
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger>
                    {#snippet child({ props: moreCatTip })}
                      <span
                        class="cursor-default rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground/60"
                        {...moreCatTip}>+{group.components.length - 8} more</span
                      >
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content
                    side="bottom"
                    sideOffset={4}
                    class="max-h-64 overflow-y-auto p-3"
                    portalProps={{ disabled: true }}
                  >
                    <div class="flex flex-col gap-0.5">
                      {#each group.components.slice(8) as extra (extra)}
                        <a
                          href="/components/{extra}"
                          class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                        >
                          <ComponentIcon class="size-3 shrink-0 opacity-50" />
                          <span class="flex-1">{toTitle(extra)}</span>
                          <ArrowRight class="size-3 shrink-0 opacity-40" />
                        </a>
                      {/each}
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              {/if}
            </div>
          </div>
        {:else}
          <div
            class="col-span-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card py-12 text-center"
          >
            <ComponentIcon class="size-8 text-muted-foreground/20" />
            <div class="flex flex-col items-center gap-1">
              <p class="text-sm font-medium text-muted-foreground/60">No categories yet</p>
              <p class="max-w-56 text-xs leading-relaxed text-muted-foreground/40">
                Add lens.ts metadata files to your components to organize them into categories
              </p>
            </div>
          </div>
        {/each}
      </div>
    {:else if viewMode === 'compact'}
      <!-- Compact / dense grid view -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {#each filteredGroups as group (group.name)}
          {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
          {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
          <a
            href="/components/category/{group.name}"
            class="group/compact flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <CatIcon class="size-4 shrink-0 {catColor}" />
            <span
              class="min-w-0 flex-1 truncate text-sm font-medium group-hover/compact:text-primary"
              >{group.label}</span
            >
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: compactCountTip })}
                  <span
                    class="cursor-default text-xs tabular-nums text-muted-foreground"
                    onclick={(e) => e.preventDefault()}
                    {...compactCountTip}>{group.components.length}</span
                  >
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content
                side="bottom"
                sideOffset={4}
                class="max-h-64 overflow-y-auto p-3"
                portalProps={{ disabled: true }}
              >
                <div class="flex flex-col gap-0.5">
                  {#each group.components as comp (comp)}
                    <a
                      href="/components/{comp}"
                      class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
          </a>
        {:else}
          <div
            class="col-span-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card py-12 text-center"
          >
            <ComponentIcon class="size-8 text-muted-foreground/20" />
            <p class="text-sm font-medium text-muted-foreground/60">No categories yet</p>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List view -->
      <div class="rounded-lg border bg-card">
        {#each filteredGroups as group, gi (group.name)}
          {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
          {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
          {#if gi > 0}
            <div class="border-t"></div>
          {/if}
          <a
            href="/components/category/{group.name}"
            class="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div class="flex size-8 items-center justify-center rounded-lg bg-muted/50">
              <CatIcon class="size-4 {catColor}" />
            </div>
            <div class="min-w-0 flex-1">
              <span class="text-sm font-medium group-hover/row:text-primary">{group.label}</span>
            </div>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: listCountTip })}
                  <span
                    class="cursor-default text-xs tabular-nums text-muted-foreground"
                    onclick={(e) => e.preventDefault()}
                    {...listCountTip}>{group.components.length}</span
                  >
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content
                side="bottom"
                sideOffset={4}
                class="max-h-64 overflow-y-auto p-3"
                portalProps={{ disabled: true }}
              >
                <div class="flex flex-col gap-0.5">
                  {#each group.components as comp (comp)}
                    <a
                      href="/components/{comp}"
                      class="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
            <ArrowRight
              class="size-3.5 text-muted-foreground/30 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary"
            />
          </a>
        {:else}
          <div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ComponentIcon class="size-8 text-muted-foreground/20" />
            <div class="flex flex-col items-center gap-1">
              <p class="text-sm font-medium text-muted-foreground/60">No categories yet</p>
              <p class="max-w-56 text-xs leading-relaxed text-muted-foreground/40">
                Add lens.ts metadata files to your components to organize them into categories
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
