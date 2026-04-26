<script lang="ts">
  /**
   * Category page — shows all components belonging to a single category.
   *
   * Displays a category header with icon, description, search, and a grid of component
   * cards with name, description, tags, compatibility status, and links.
   * Data is self-contained via import.meta.glob (same pattern as other Lens pages).
   */
  import { page } from '$app/state';
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { LensMeta, LensStatus } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    extractComponentDescription,
    type LensCompatibility,
  } from '@/ui/lens/lens-utils.js';
  import { log } from '@/utils/core/logger';
  import Badge from '@/ui/badge/badge.svelte';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import { getContext, type Component } from 'svelte';
  import {
    CATEGORY_ICONS,
    CATEGORY_COLORS,
    CATEGORY_BG,
    CATEGORY_DESCRIPTIONS,
    categoryLabel as catLabelFn,
  } from '$lib/config/lens-categories';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import CompatTooltip from '@/ui/lens/CompatTooltip.svelte';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Check from '@lucide/svelte/icons/check';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';

  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Tag from '@lucide/svelte/icons/tag';
  import X from '@lucide/svelte/icons/x';
  import PackageOpen from '@lucide/svelte/icons/package-open';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import Input from '@/ui/input/input.svelte';
  import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';

  /* ------------------------------------------------------------------ */
  /*  Glob-based data                                                    */
  /* ------------------------------------------------------------------ */

  /** All .svelte files in @/ui for component directory discovery. */
  const allModules: Record<Str, unknown> = import.meta.glob('@/ui/*/*.svelte');

  /** Raw .svelte sources for description extraction. */
  const rawSources: Record<Str, Str> = import.meta.glob('@/ui/*/*.svelte', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /** Eager lens.ts metadata. */
  const lensMetaModules: Record<Str, { meta?: LensMeta; default?: unknown; examples?: unknown }> =
    import.meta.glob('@/ui/*/lens.ts', { import: '*', eager: true }) as Record<
      Str,
      { meta?: LensMeta; default?: unknown; examples?: unknown }
    >;

  /* ------------------------------------------------------------------ */
  /*  Derived data                                                       */
  /* ------------------------------------------------------------------ */

  /** Current category from URL parameter. */
  const category: Str = $derived(page.params.category ?? '');

  /** Category display label. */
  const categoryLabel: Str = $derived(category.length > 0 ? catLabelFn(category) : ('' as Str));

  /** Sorted unique component directory names. */
  const allComponentNames: Str[] = [...new Set(Object.keys(allModules).map(extractDir))]
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

  /** Components in the current category. */
  const categoryComponents: Str[] = $derived(
    allComponentNames.filter((n: Str): boolean => {
      const m: LensMeta | undefined = metaByName.get(n);
      return (m?.category ?? 'display') === category;
    }),
  );

  /* ------------------------------------------------------------------ */
  /*  Compatibility data from parent layout (via Svelte context)         */
  /* ------------------------------------------------------------------ */

  /** Lens compatibility results per component, set by +layout.svelte. */
  const compatByName: Map<Str, LensCompatibility> = getContext('lens-compat-by-name');

  /** Short rule descriptions for all 18 Lens compatibility rules (R0–R17). */
  const lensRuleNames: readonly Str[] = getContext('lens-rule-names');

  /* ------------------------------------------------------------------ */
  /*  Search                                                              */
  /* ------------------------------------------------------------------ */

  /** Search query for filtering components within this category. */
  let searchQuery: Str = $state('' as Str);

  /** View mode. */
  let viewMode: 'grid' | 'compact' | 'list' | 'table' = $state('grid');

  /** Active sort field (empty = default name-asc order). */
  let sortField: Str = $state('' as Str);

  /** Sort direction. */
  let sortDir: 'asc' | 'desc' = $state('asc');

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Human-readable label for the current view mode. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'compact') {
      return 'Dense' as Str;
    }
    if (viewMode === 'list') {
      return 'List' as Str;
    }
    if (viewMode === 'table') {
      return 'Table' as Str;
    }
    return 'Grid' as Str;
  });

  /** Human-readable label for the active sort, or empty when default. */
  const sortLabel: Str = $derived.by((): Str => {
    if (sortField === 'name') {
      return 'Name' as Str;
    }
    if (sortField === 'tag-count') {
      return 'Tags' as Str;
    }
    if (sortField === 'description') {
      return 'Desc' as Str;
    }
    if (sortField === 'compatibility') {
      return 'Compat' as Str;
    }
    if (sortField === 'status') {
      return 'Status' as Str;
    }
    return '' as Str;
  });

  /**
   * Compute a raw ascending sort value for two components.
   *
   * @param a - First component name
   * @param b - Second component name
   * @returns Numeric comparison value
   */
  function getSortValue(a: Str, b: Str): Num {
    if (sortField === 'name') {
      return a.localeCompare(b) as Num;
    }
    if (sortField === 'tag-count') {
      return ((metaByName.get(a)?.tags?.length ?? 0) -
        (metaByName.get(b)?.tags?.length ?? 0)) as Num;
    }
    if (sortField === 'description') {
      return ((getDescription(a) ? 0 : 1) - (getDescription(b) ? 0 : 1)) as Num;
    }
    if (sortField === 'compatibility') {
      const aOk: Num = (compatByName.get(a)?.compatible ? 1 : 0) as Num;
      const bOk: Num = (compatByName.get(b)?.compatible ? 1 : 0) as Num;
      return (aOk - bOk) as Num;
    }
    if (sortField === 'status') {
      const statusOrder: Record<string, Num> = {
        new: 0 as Num,
        updated: 1 as Num,
        deprecated: 2 as Num,
      };
      const aS: Num = statusOrder[metaByName.get(a)?.status ?? ''] ?? (3 as Num);
      const bS: Num = statusOrder[metaByName.get(b)?.status ?? ''] ?? (3 as Num);
      return (aS - bS) as Num;
    }
    return 0 as Num;
  }

  /** Filtered and sorted components. */
  const filteredComponents: Str[] = $derived.by((): Str[] => {
    let names: Str[] = categoryComponents;

    // Filter by search
    if (searchQuery.length > 0) {
      const q: Str = searchQuery.toLowerCase() as Str;
      names = names.filter((n: Str): boolean => {
        const label: Str = toTitle(n).toLowerCase() as Str;
        if (label.includes(q)) {
          return true;
        }
        const meta: LensMeta | undefined = metaByName.get(n);
        if (meta?.tags?.some((t: Str): boolean => t.toLowerCase().includes(q))) {
          return true;
        }
        const desc: Str = getDescription(n).toLowerCase() as Str;
        return desc.includes(q);
      });
    }

    // Sort
    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      names = [...names].toSorted((a: Str, b: Str): Num => {
        const raw: Num = getSortValue(a, b);
        return (raw * mul) as Num;
      });
    }
    // When sortField is empty, categoryComponents default order (name-asc) is kept

    return names;
  });

  /* ------------------------------------------------------------------ */
  /*  Mappings                                                            */
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
   * Get the description for a component from its source JSDoc.
   *
   * @param name - Component directory name
   * @returns The component description or empty string
   */
  function getDescription(name: Str): Str {
    const sources: Str[] = Object.entries(rawSources)
      .filter(([k]: [Str, Str]): boolean => extractDir(k) === name)
      .map(([, v]: [Str, Str]): Str => v);
    for (const src of sources) {
      const desc: Str | undefined = extractComponentDescription(src);
      if (desc) {
        return desc;
      }
    }
    return '' as Str;
  }

  /** Resolved category icon. */
  const CatIcon: Component = $derived(CATEGORY_ICONS[category] ?? ComponentIcon);

  /** Resolved category color class. */
  const catColor: Str = $derived(CATEGORY_COLORS[category] ?? ('text-muted-foreground' as Str));

  /** Resolved category background class. */
  const catBg: Str = $derived(CATEGORY_BG[category] ?? ('bg-muted' as Str));

  /** Resolved category description. */
  const catDesc: Str = $derived(CATEGORY_DESCRIPTIONS[category] ?? ('' as Str));

  /** Dynamic subtitle showing component count. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery.trim()) {
      return `${filteredComponents.length} of ${categoryComponents.length} components` as Str;
    }
    return `${categoryComponents.length} components` as Str;
  });

  /** Two-step reset confirmation. */
  let confirmingReset: Bool = $state(false as Bool);
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Whether any customization is active. */
  const isCustomized: boolean = $derived(
    searchQuery.trim().length > 0 || viewMode !== 'grid' || sortField !== '',
  );

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
      description: 'Component names array' as Str,
      ext: '' as Str,
    },
    {
      id: 'copy-markdown' as Str,
      label: 'Copy as Markdown' as Str,
      icon: FileText,
      category: 'Clipboard' as Str,
      description: 'Formatted list for docs' as Str,
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

  /**
   * Two-step reset handler.
   */
  function handleReset(): void {
    if (confirmingReset) {
      searchQuery = '' as Str;
      viewMode = 'grid';
      sortField = '' as Str;
      sortDir = 'asc';
      confirmingReset = false as Bool;
      if (confirmResetTimer) {
        clearTimeout(confirmResetTimer);
      }
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
   * @param itemId - Export item identifier
   */
  function handleExport(itemId: Str): void {
    const names: Str[] = categoryComponents.map(toTitle);

    if (itemId === 'copy-json') {
      navigator.clipboard.writeText(JSON.stringify(names, null, 2));
    } else if (itemId === 'copy-markdown') {
      const md: Str =
        `## ${categoryLabel}\n${names.map((n: Str): Str => `- ${n}` as Str).join('\n')}` as Str;
      navigator.clipboard.writeText(md);
    } else if (itemId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(names, null, 2)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob) as Str;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = `lens-${category}-components.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
</script>

<div class="w-full">
  <!-- Sticky header + controls (matches component page LensHeader pattern) -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class={cn('flex size-12 items-center justify-center rounded-xl', catBg)}>
        <CatIcon class="size-6 {catColor}" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">{categoryLabel}</h1>
        <p class="text-sm text-muted-foreground">
          {#if catDesc}{catDesc} ·
          {/if}{headerSubtitle}
        </p>
      </div>

      <!-- Page-level three-dot menu -->
      <DropdownMenu.Root>
        <Tooltip.Provider>
          <Tooltip.Root delayDuration={300}>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps }: { props: Record<string, unknown> })}
                <DropdownMenu.Trigger>
                  {#snippet child({ props: triggerProps }: { props: Record<string, unknown> })}
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
            onOpenChange={(open: boolean) => {
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
                { v: 'grid', l: 'Grid', d: 'Component cards' },
                { v: 'compact', l: 'Dense Grid', d: 'Names only, no details' },
                { v: 'list', l: 'List', d: 'Compact rows' },
                { v: 'table', l: 'Table', d: 'Rows with all details' },
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
                      viewMode = opt.v as 'grid' | 'compact' | 'list' | 'table';
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
            onOpenChange={(open: boolean) => {
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
                { v: 'tag-count', l: 'Tags', d: 'By tag count' },
                { v: 'description', l: 'Description', d: 'Documented first' },
                { v: 'compatibility', l: 'Compatibility', d: 'Compliant first' },
                { v: 'status', l: 'Status', d: 'By lifecycle status' },
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
                      <ArrowUp class="mr-1 size-4 shrink-0 text-primary" />
                    {:else if sortField === opt.v && sortDir === 'desc'}
                      <ArrowDown class="mr-1 size-4 shrink-0 text-primary" />
                    {:else}
                      <ArrowUpDown class="mr-1 size-4 shrink-0 opacity-30" />
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
            onSelect={(e: Event) => {
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
        placeholder="Search {categoryLabel.toLowerCase()} components..."
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
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
    <!-- Component Grid -->
    {#if categoryComponents.length === 0}
      <!-- Empty category — no components at all -->
      <div
        class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card py-16 text-center"
      >
        <div class={cn('flex size-16 items-center justify-center rounded-2xl', catBg)}>
          <PackageOpen class="size-8 {catColor} opacity-40" />
        </div>
        <div class="flex flex-col items-center gap-1.5">
          <h3 class="text-sm font-semibold text-muted-foreground/60">No components yet</h3>
          <p class="max-w-64 text-xs leading-relaxed text-muted-foreground/40">
            Components categorized as "{categoryLabel.toLowerCase()}" will appear here. Add a
            <code
              class="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground/60"
              >lens.ts</code
            >
            file with
            <code
              class="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground/60"
              >category: '{category}'</code
            > to get started.
          </p>
        </div>
        <a
          href="/components"
          class="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowRight class="size-3 rotate-180" />
          Back to overview
        </a>
      </div>
    {:else if filteredComponents.length === 0}
      <LensEmpty
        title="No results"
        actionLabel="Clear search"
        onaction={() => (searchQuery = '' as Str)}
        class="bg-card"
      >
        {#snippet icon()}
          <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
            <SearchIcon class="size-8 text-muted-foreground/20" />
          </div>
        {/snippet}
        {#snippet descriptionSnippet()}
          No components matching "<span class="font-medium text-muted-foreground/60"
            >{searchQuery}</span
          >" in {categoryLabel.toLowerCase()}.
        {/snippet}
      </LensEmpty>
    {:else if viewMode === 'grid'}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredComponents as name (name)}
          {@const meta = metaByName.get(name)}
          {@const desc = getDescription(name)}
          {@const compat = compatByName.get(name)}
          {@const isCompat = compat?.compatible === true}
          <a
            href="/components/{name}"
            class="group flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <CatIcon class="size-4 {catColor}" />
                <h3 class="text-sm font-semibold group-hover:text-primary">{toTitle(name)}</h3>
              </div>
              <div class="flex items-center gap-1.5">
                {#if meta?.status}
                  <Badge variant="secondary" class="text-[10px] {STATUS_COLORS[meta.status]}">
                    {STATUS_LABELS[meta.status]}
                  </Badge>
                {/if}
                <CompatTooltip {compat} ruleNames={lensRuleNames} componentName={name} />
              </div>
            </div>
            {#if desc}
              <p class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {desc.replace(/^[A-Z][A-Za-z]*\s*[—–\-]\s*/, '')}
              </p>
            {/if}
            <div class="mt-auto flex items-center justify-between">
              <div class="flex flex-wrap gap-1">
                {#if meta?.tags}
                  {#each meta.tags.slice(0, 3) as tag (tag)}
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      onclick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `/components/tags?q=${encodeURIComponent(tag)}`;
                      }}
                    >
                      <Tag class="size-3" />
                      {tag}
                    </button>
                  {/each}
                  {#if meta.tags.length > 3}
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tagTip }: { props: Record<string, unknown> })}
                          <span
                            class="cursor-default rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground/60"
                            {...tagTip}
                          >
                            +{meta.tags.length - 3} more
                          </span>
                        {/snippet}
                      </Tooltip.Trigger>
                      <Tooltip.Content
                        side="bottom"
                        sideOffset={4}
                        class="max-h-64 overflow-y-auto p-3"
                        portalProps={{ disabled: true }}
                      >
                        <div class="flex flex-col gap-0.5">
                          {#each meta.tags.slice(3) as extraTag (extraTag)}
                            <button
                              type="button"
                              class="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                              onclick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/components/tags?q=${encodeURIComponent(extraTag)}`;
                              }}
                            >
                              <Tag class="size-3 shrink-0 opacity-50" />
                              <span class="flex-1">{extraTag}</span>
                              <ArrowRight class="size-3 shrink-0 opacity-40" />
                            </button>
                          {/each}
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {/if}
                {/if}
              </div>
              <ArrowRight
                class="size-3.5 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </div>
          </a>
        {/each}
      </div>
    {:else if viewMode === 'compact'}
      <!-- Compact / dense grid view -->
      <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {#each filteredComponents as name (name)}
          <a
            href="/components/{name}"
            class="group/compact flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <CatIcon class="size-3.5 shrink-0 {catColor}" />
            <span
              class="min-w-0 flex-1 truncate text-xs font-medium group-hover/compact:text-primary"
              >{toTitle(name)}</span
            >
          </a>
        {/each}
      </div>
    {:else if viewMode === 'table'}
      <!-- Table view -->
      <div class="rounded-lg border bg-card">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="p-0 text-left font-medium text-muted-foreground">
                <button
                  type="button"
                  class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                  onclick={() => {
                    if (sortField === 'name' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'name' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'name' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Name
                  {#if sortField === 'name' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'name' && sortDir === 'desc'}
                    <ArrowDown class="size-3 text-primary" />
                  {:else}
                    <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="p-0 text-left font-medium text-muted-foreground">
                <button
                  type="button"
                  class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                  onclick={() => {
                    if (sortField === 'description' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'description' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'description' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Description
                  {#if sortField === 'description' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'description' && sortDir === 'desc'}
                    <ArrowDown class="size-3 text-primary" />
                  {:else}
                    <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="p-0 text-left font-medium text-muted-foreground">
                <button
                  type="button"
                  class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                  onclick={() => {
                    if (sortField === 'tag-count' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'tag-count' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'tag-count' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Tags
                  {#if sortField === 'tag-count' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'tag-count' && sortDir === 'desc'}
                    <ArrowDown class="size-3 text-primary" />
                  {:else}
                    <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="p-0 text-left font-medium text-muted-foreground">
                <button
                  type="button"
                  class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                  onclick={() => {
                    if (sortField === 'status' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'status' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'status' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Status
                  {#if sortField === 'status' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'status' && sortDir === 'desc'}
                    <ArrowDown class="size-3 text-primary" />
                  {:else}
                    <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                  {/if}
                </button>
              </th>
              <th class="p-0 text-left font-medium text-muted-foreground">
                <button
                  type="button"
                  class="group/th flex w-full items-center gap-1 px-4 py-2 transition-colors hover:text-foreground"
                  onclick={() => {
                    if (sortField === 'compatibility' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'compatibility' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'compatibility' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Compatibility
                  {#if sortField === 'compatibility' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'compatibility' && sortDir === 'desc'}
                    <ArrowDown class="size-3 text-primary" />
                  {:else}
                    <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                  {/if}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each filteredComponents as name (name)}
              {@const meta = metaByName.get(name)}
              {@const desc = getDescription(name)}
              {@const compat = compatByName.get(name)}
              {@const isCompat = compat?.compatible === true}
              <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                <td class="px-4 py-2.5">
                  <a
                    href="/components/{name}"
                    class="flex items-center gap-2 font-medium text-foreground hover:text-primary"
                  >
                    <CatIcon class="size-3.5 shrink-0 {catColor}" />
                    {toTitle(name)}
                  </a>
                </td>
                <td class="px-4 py-2.5">
                  <span class="line-clamp-1 text-xs text-muted-foreground"
                    >{desc.replace(/^[A-Z][A-Za-z]*\s*[—–\-]\s*/, '') || '—'}</span
                  >
                </td>
                <td class="px-4 py-2.5">
                  <div class="flex flex-wrap gap-1">
                    {#if meta?.tags}
                      {#each meta.tags as tag (tag)}
                        <a
                          href="/components/tags?q={encodeURIComponent(tag)}"
                          class="inline-flex items-center gap-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          ><Tag class="size-3 shrink-0 opacity-60" />{tag}</a
                        >
                      {/each}
                    {:else}
                      <span class="text-[10px] text-muted-foreground/40">—</span>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-2.5">
                  {#if meta?.status}
                    <Badge variant="secondary" class="text-[10px] {STATUS_COLORS[meta.status]}">
                      {STATUS_LABELS[meta.status]}
                    </Badge>
                  {:else}
                    <span class="text-[10px] text-muted-foreground/40">—</span>
                  {/if}
                </td>
                <td class="px-4 py-2.5">
                  <CompatTooltip {compat} ruleNames={lensRuleNames} componentName={name} />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <!-- List view -->
      <div class="rounded-lg border bg-card">
        {#each filteredComponents as name, ni (name)}
          {@const meta = metaByName.get(name)}
          {@const compat = compatByName.get(name)}
          {@const isCompat = compat?.compatible === true}
          {#if ni > 0}
            <div class="border-t"></div>
          {/if}
          <a
            href="/components/{name}"
            class="group/row flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <CatIcon class="size-4 shrink-0 {catColor}" />
            <span class="min-w-0 flex-1 truncate text-sm font-medium group-hover/row:text-primary"
              >{toTitle(name)}</span
            >
            {#if meta?.status}
              <Badge variant="secondary" class="text-[10px] {STATUS_COLORS[meta.status]}">
                {STATUS_LABELS[meta.status]}
              </Badge>
            {/if}
            <CompatTooltip {compat} ruleNames={lensRuleNames} componentName={name} />
            <ArrowRight
              class="size-3.5 shrink-0 text-muted-foreground/30 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary"
            />
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
