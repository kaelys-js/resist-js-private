<script lang="ts">
  /**
   * Tags index page — browse all component tags with search, filtering,
   * and component counts.
   *
   * Matches the Icons page UX: sticky header, 3-dot dropdown, inline search,
   * grid of tag cards showing component counts and samples.
   */
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
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
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

  /** Search query. */
  let searchQuery: Str = $state('' as Str);

  /** View mode for tag display. */
  let viewMode: 'grid' | 'list' = $state('grid');

  /** Sort mode for tags. */
  let sortMode: Str = $state('alphabetical' as Str);

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

    if (sortMode === 'count-desc') {
      tags = [...tags].toSorted(
        (a: Str, b: Str): Num =>
          ((tagMap.get(b)?.length ?? 0) - (tagMap.get(a)?.length ?? 0)) as Num,
      );
    } else if (sortMode === 'count-asc') {
      tags = [...tags].toSorted(
        (a: Str, b: Str): Num =>
          ((tagMap.get(a)?.length ?? 0) - (tagMap.get(b)?.length ?? 0)) as Num,
      );
    }
    // 'alphabetical' is default — allTags is already sorted

    return tags;
  });

  /** Dynamic subtitle. */
  const headerSubtitle: Str = $derived.by((): Str => {
    if (searchQuery.trim()) {
      return `${filteredTags.length} of ${allTags.length} tags` as Str;
    }
    return `${allTags.length} tags across ${componentNames.length} components` as Str;
  });

  /** Whether any customization is active. */
  const isCustomized: boolean = $derived(
    searchQuery.trim().length > 0 || viewMode !== 'grid' || sortMode !== 'alphabetical',
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

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  /** Two-step reset handler. */
  function handleReset(): void {
    if (confirmingReset) {
      searchQuery = '' as Str;
      viewMode = 'grid';
      sortMode = 'alphabetical' as Str;
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
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <DownloadIcon class="mr-2 size-4" />
              Export
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-64">
              {#each PAGE_EXPORT_CATEGORIES as exportCat (exportCat)}
                <DropdownMenu.Label
                  class="flex items-center gap-1.5 px-2 text-xs text-muted-foreground/60"
                >
                  {exportCat}
                </DropdownMenu.Label>
                {#each PAGE_EXPORT_ITEMS.filter((p) => p.category === exportCat) as item (item.id)}
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
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />

          <!-- Customize submenu -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
              <SlidersHorizontal class="mr-2 size-4" />
              Customize
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent class="w-56">
              <DropdownMenu.Label
                class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
              >
                <LayoutGrid class="size-3" />
                View Mode
              </DropdownMenu.Label>
              {#each [{ v: 'grid', l: 'Grid', d: 'Tag cards with samples' }, { v: 'list', l: 'List', d: 'Compact rows with counts' }] as opt (opt.v)}
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    viewMode = opt.v as 'grid' | 'list';
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

              <DropdownMenu.Separator />

              <DropdownMenu.Label
                class="flex items-center gap-1.5 text-xs text-muted-foreground/60"
              >
                <ArrowUpDown class="size-3" />
                Sort By
              </DropdownMenu.Label>
              {#each [{ v: 'alphabetical', l: 'Alphabetical', d: 'A–Z' }, { v: 'count-desc', l: 'Most Used', d: 'Most components first' }, { v: 'count-asc', l: 'Least Used', d: 'Fewest components first' }] as opt (opt.v)}
                <DropdownMenu.Item
                  closeOnSelect={false}
                  onclick={() => {
                    sortMode = opt.v as Str;
                  }}
                >
                  <Check
                    class={cn(
                      'size-4 shrink-0 transition-opacity duration-150',
                      sortMode !== opt.v && 'opacity-0',
                    )}
                  />
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="text-sm">{opt.l}</span>
                    <span class="text-[11px] text-muted-foreground/60">{opt.d}</span>
                  </div>
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator />

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
    {:else}
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
                  class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >{toTitle(comp)}</a
                >
              {/each}
              {#if components.length > 6}
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger>
                    {#snippet child({ props: moreTip })}
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
    {/if}
  </div>
</div>
