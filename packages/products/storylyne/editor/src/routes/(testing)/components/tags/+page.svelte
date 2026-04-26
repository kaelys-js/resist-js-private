<script lang="ts">
  /**
   * Tags index page — browse all component tags with search, filtering,
   * and component counts.
   *
   * Matches the Icons page UX: sticky header, 3-dot dropdown, inline search,
   * grid of tag cards showing component counts and samples.
   */
  import { page } from '$app/state';
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { LensMeta } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import { extractDir, toTitle, parseLensMeta } from '@/ui/lens/lens-utils.js';
  import { log } from '@/utils/core/logger';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import TagIcon from '@lucide/svelte/icons/tag';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Check from '@lucide/svelte/icons/check';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';

  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
  import SearchX from '@lucide/svelte/icons/search-x';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import X from '@lucide/svelte/icons/x';
  import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
  import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
  import FileText from '@lucide/svelte/icons/file-text';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import Input from '@/ui/input/input.svelte';

  /* ------------------------------------------------------------------ */
  /*  Glob-based data                                                    */
  /* ------------------------------------------------------------------ */

  /** All .svelte files in @/ui for component directory discovery. */
  const allModules: Record<Str, unknown> = import.meta.glob('@/ui/*/*.svelte');

  /** Eager lens.ts metadata. */
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

  /** Tag → component names mapping. */
  const tagMap: Map<Str, Str[]> = new Map();
  for (const [name, meta] of metaByName.entries()) {
    for (const tag of meta.tags) {
      const existing: Str[] | undefined = tagMap.get(tag);
      if (existing) {
        existing.push(name);
      } else {
        tagMap.set(tag, [name]);
      }
    }
  }

  /** All tags sorted alphabetically. */
  const allTags: Str[] = [...tagMap.keys()].toSorted();

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */

  /** Search query — initialized from ?q= URL parameter if present. */
  let searchQuery: Str = $state((page.url.searchParams.get('q') ?? '') as Str);

  /** View mode for tag display. */
  let viewMode: 'grid' | 'compact' | 'list' | 'table' = $state('grid');

  /** Active sort field (empty string = default alphabetical). */
  let sortField: Str = $state('' as Str);

  /** Sort direction: 'asc' | 'desc'. Only meaningful when sortField is set. */
  let sortDir: 'asc' | 'desc' = $state('asc');

  /** Search query inside the View Mode submenu. */
  let viewSearchQuery: Str = $state('' as Str);

  /** Search query inside the Sort By submenu. */
  let sortSearchQuery: Str = $state('' as Str);

  /** Two-step reset confirmation. */
  let confirmingReset: Bool = $state(false as Bool);
  let confirmResetTimer: ReturnType<typeof setTimeout> | undefined;

  /* ------------------------------------------------------------------ */
  /*  Filtered + sorted tags                                             */
  /* ------------------------------------------------------------------ */

  /** Tags filtered by search query and sorted. */
  const filteredTags: Str[] = $derived.by((): Str[] => {
    const q: Str = searchQuery.trim().toLowerCase() as Str;
    let tags: Str[] = allTags;
    if (q) {
      tags = tags.filter((tag: Str): boolean => tag.toLowerCase().includes(q as string));
    }

    if (sortField) {
      const mul: Num = (sortDir === 'desc' ? -1 : 1) as Num;
      if (sortField === 'name') {
        tags = [...tags].toSorted(
          (a: Str, b: Str): Num => ((mul as number) * a.localeCompare(b)) as Num,
        );
      } else if (sortField === 'count' || sortField === 'components') {
        tags = [...tags].toSorted(
          (a: Str, b: Str): Num =>
            ((mul as number) *
              ((tagMap.get(a)?.length ?? 0) - (tagMap.get(b)?.length ?? 0))) as Num,
        );
      }
    }
    // Empty sortField = default alphabetical (allTags already sorted)

    return tags;
  });

  /** Dynamic subtitle. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery.trim()) {
      return `${filteredTags.length} of ${allTags.length} tags` as Str;
    }
    return `${allTags.length} tags across ${componentNames.length} components` as Str;
  });

  /** Current view mode display label. */
  const viewModeLabel: Str = $derived.by((): Str => {
    if (viewMode === 'grid') {
      return 'Grid' as Str;
    }
    if (viewMode === 'table') {
      return 'Table' as Str;
    }
    if (viewMode === 'compact') {
      return 'Dense Chips' as Str;
    }
    return 'List' as Str;
  });

  /** Current sort display label (field + direction arrow, or empty if default). */
  const sortLabel: Str = $derived.by((): Str => {
    if (!sortField) {
      return '' as Str;
    }
    const names: Record<string, string> = {
      name: 'Tag',
      count: 'Components',
      components: 'Sample Components',
    };
    const arrow: Str = (sortDir === 'asc' ? '\u2191' : '\u2193') as Str;
    return `${names[sortField] ?? sortField} ${arrow}` as Str;
  });

  /** Whether any customization is active. */
  const isCustomized: boolean = $derived(
    searchQuery.trim().length > 0 || viewMode !== 'grid' || sortField !== '',
  );

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
      description: 'Tags with component lists' as Str,
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

  /** Two-step reset handler. */
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
    const data: Record<Str, Str[]> = Object.fromEntries(
      allTags.map((tag: Str): [Str, Str[]] => [tag, (tagMap.get(tag) ?? []).map(toTitle)]),
    ) as Record<Str, Str[]>;

    if (itemId === 'copy-json') {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } else if (itemId === 'copy-markdown') {
      const md: Str = allTags
        .map(
          (tag: Str): Str =>
            `## ${tag}\n${(tagMap.get(tag) ?? []).map((n: Str): Str => `- ${toTitle(n)}` as Str).join('\n')}` as Str,
        )
        .join('\n\n') as Str;
      navigator.clipboard.writeText(md);
    } else if (itemId === 'download-json') {
      const blob: Blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url: Str = URL.createObjectURL(blob) as Str;
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'lens-tags.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
</script>

<div class="w-full">
  <!-- Sticky header -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <TagIcon class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Tags</h1>
        <p class="text-sm text-muted-foreground">{headerSubtitle}</p>
      </div>

      <!-- 3-dot menu -->
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
                { v: 'grid', l: 'Grid', d: 'Tag cards with samples' },
                { v: 'table', l: 'Table', d: 'Full details with columns' },
                { v: 'compact', l: 'Dense Chips', d: 'Inline chips with counts' },
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
                { v: 'name', l: 'Tag', d: 'Alphabetical by tag name' },
                { v: 'count', l: 'Components', d: 'By component count' },
                { v: 'components', l: 'Sample Components', d: 'By component count' },
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
                    class="group"
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
        placeholder="Search {allTags.length} tags..."
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

  <!-- Page content -->
  <div class="flex flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
    {#if filteredTags.length === 0}
      <div
        class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card py-16 text-center"
      >
        <div class="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
          <SearchX class="size-8 text-muted-foreground/40" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted-foreground/60">No matching tags</p>
          <p class="max-w-64 text-xs leading-relaxed text-muted-foreground/40">
            Try a different search term
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onclick={() => {
            searchQuery = '' as Str;
          }}
        >
          <X class="size-3" />
          Clear search
        </button>
      </div>
    {:else if viewMode === 'grid'}
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each filteredTags as tag (tag)}
          {@const components = tagMap.get(tag) ?? []}
          <div
            class="flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <TagIcon class="size-4 text-primary" />
                <h3 class="text-sm font-semibold">{tag}</h3>
              </div>
              <span class="text-xs tabular-nums text-muted-foreground"
                >{components.length} component{components.length === 1 ? '' : 's'}</span
              >
            </div>
            <div class="flex flex-wrap gap-1">
              {#each components.slice(0, 6) as comp (comp)}
                <a
                  href="/components/{comp}"
                  class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  ><ComponentIcon class="size-3 shrink-0 opacity-60" />{toTitle(comp)}</a
                >
              {/each}
              {#if components.length > 6}
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger>
                    {#snippet child({ props: moreTip }: { props: Record<string, unknown> })}
                      <span
                        class="cursor-default rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground/60"
                        {...moreTip}>+{components.length - 6} more</span
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
                      {#each components.slice(6) as extra (extra)}
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
                  Tag
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
                    if (sortField === 'count' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'count' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'count' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Components
                  {#if sortField === 'count' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'count' && sortDir === 'desc'}
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
                    if (sortField === 'components' && sortDir === 'asc') {
                      sortDir = 'desc';
                    } else if (sortField === 'components' && sortDir === 'desc') {
                      sortField = '' as Str;
                      sortDir = 'asc';
                    } else {
                      sortField = 'components' as Str;
                      sortDir = 'asc';
                    }
                  }}
                >
                  Sample Components
                  {#if sortField === 'components' && sortDir === 'asc'}
                    <ArrowUp class="size-3 text-primary" />
                  {:else if sortField === 'components' && sortDir === 'desc'}
                    <ArrowDown class="size-3 text-primary" />
                  {:else}
                    <ArrowUp class="size-3 opacity-0 group-hover/th:opacity-40" />
                  {/if}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each filteredTags as tag (tag)}
              {@const components = tagMap.get(tag) ?? []}
              <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-2 font-medium">
                    <TagIcon class="size-3.5 shrink-0 text-primary" />
                    {tag}
                  </div>
                </td>
                <td class="px-4 py-2.5">
                  <span class="text-xs tabular-nums text-muted-foreground">{components.length}</span
                  >
                </td>
                <td class="px-4 py-2.5">
                  <div class="flex flex-wrap gap-1">
                    {#each components.slice(0, 4) as comp (comp)}
                      <a
                        href="/components/{comp}"
                        class="inline-flex items-center gap-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        ><ComponentIcon class="size-3 shrink-0 opacity-60" />{toTitle(comp)}</a
                      >
                    {/each}
                    {#if components.length > 4}
                      <Tooltip.Root delayDuration={300}>
                        <Tooltip.Trigger>
                          {#snippet child({
                            props: tblMoreTip,
                          }: {
                            props: Record<string, unknown>;
                          })}
                            <span
                              class="cursor-default rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground/60"
                              {...tblMoreTip}>+{components.length - 4} more</span
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
                            {#each components.slice(4) as extra (extra)}
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
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if viewMode === 'compact'}
      <!-- Dense chips view -->
      <div class="flex flex-wrap gap-1.5">
        {#each filteredTags as tag (tag)}
          {@const components = tagMap.get(tag) ?? []}
          <span
            class="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary/30"
          >
            <TagIcon class="size-3 shrink-0 text-primary" />
            {tag}
            <span
              class="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] tabular-nums text-muted-foreground"
              >{components.length}</span
            >
          </span>
        {/each}
      </div>
    {:else}
      <!-- List view -->
      <div class="rounded-lg border bg-card">
        {#each filteredTags as tag, ti (tag)}
          {@const components = tagMap.get(tag) ?? []}
          {#if ti > 0}
            <div class="border-t"></div>
          {/if}
          <div class="flex items-center gap-3 px-4 py-3">
            <TagIcon class="size-4 shrink-0 text-primary" />
            <span class="text-sm font-medium">{tag}</span>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: countTip }: { props: Record<string, unknown> })}
                  <span
                    class="ml-auto cursor-default text-xs tabular-nums text-muted-foreground"
                    {...countTip}>{components.length}</span
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
                  {#each components as comp (comp)}
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
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
