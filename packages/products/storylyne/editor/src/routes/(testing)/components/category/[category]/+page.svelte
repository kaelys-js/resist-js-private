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
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import SearchIcon from '@lucide/svelte/icons/search';
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

  /** Filtered components matching the search query. */
  const filteredComponents: Str[] = $derived(
    searchQuery.length === 0
      ? categoryComponents
      : categoryComponents.filter((n: Str): boolean => {
          const q: Str = searchQuery.toLowerCase() as Str;
          const label: Str = toTitle(n).toLowerCase() as Str;
          if (label.includes(q)) return true;
          const meta: LensMeta | undefined = metaByName.get(n);
          if (meta?.tags?.some((t: Str): boolean => t.toLowerCase().includes(q))) return true;
          const desc: Str = getDescription(n).toLowerCase() as Str;
          return desc.includes(q);
        }),
  );

  /* ------------------------------------------------------------------ */
  /*  Mappings                                                            */
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
      if (desc) return desc;
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

  /** Whether search is active (for reset button state). */
  const isCustomized: boolean = $derived(searchQuery.trim().length > 0);

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

  /**
   * Two-step reset handler.
   */
  function handleReset(): void {
    if (confirmingReset) {
      searchQuery = '' as Str;
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
    {:else}
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
                <Tooltip.Root delayDuration={300}>
                  <Tooltip.Trigger>
                    {#snippet child({ props: compatTip })}
                      <span {...compatTip}>
                        {#if isCompat}
                          <CircleCheck class="size-4 text-emerald-500" />
                        {:else}
                          <CircleAlert class="size-4 text-amber-500" />
                        {/if}
                      </span>
                    {/snippet}
                  </Tooltip.Trigger>
                  <Tooltip.Content sideOffset={4} class="max-w-72" portalProps={{ disabled: true }}>
                    {#if isCompat}
                      <p class="text-xs">All compatibility rules pass</p>
                    {:else if compat}
                      {@const failedRules = new Set(
                        compat.violations.map((vi) => vi.rule as number),
                      )}
                      {@const failCount = failedRules.size}
                      {@const passCount = lensRuleNames.length - failCount}
                      <p class="mb-1 text-[10px] font-semibold">
                        Compatibility — {passCount}✓ {failCount}✗
                      </p>
                      <ul class="space-y-0.5">
                        {#each lensRuleNames as ruleName, ruleIdx (ruleIdx)}
                          {@const failed = failedRules.has(ruleIdx)}
                          <li class="flex items-start gap-1 text-[10px]">
                            <span
                              class="mt-px shrink-0 font-bold leading-none {failed
                                ? 'opacity-60'
                                : 'opacity-40'}">{failed ? '✗' : '✓'}</span
                            >
                            <span
                              ><span class="font-mono opacity-60">R{ruleIdx}</span>
                              {ruleName}</span
                            >
                          </li>
                        {/each}
                      </ul>
                    {:else}
                      <p class="text-xs">Compatibility data unavailable</p>
                    {/if}
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            </div>
            {#if desc}
              <p class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{desc}</p>
            {/if}
            <div class="mt-auto flex items-center justify-between">
              <div class="flex flex-wrap gap-1">
                {#if meta?.tags}
                  {#each meta.tags.slice(0, 3) as tag (tag)}
                    <span
                      class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <Tag class="size-3" />
                      {tag}
                    </span>
                  {/each}
                  {#if meta.tags.length > 3}
                    <Tooltip.Root delayDuration={300}>
                      <Tooltip.Trigger>
                        {#snippet child({ props: tagTip })}
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
                            <span
                              class="inline-flex items-center gap-1 text-xs text-primary-foreground/80"
                              ><Tag class="size-3 shrink-0 opacity-50" />{extraTag}</span
                            >
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
    {/if}
  </div>
</div>
