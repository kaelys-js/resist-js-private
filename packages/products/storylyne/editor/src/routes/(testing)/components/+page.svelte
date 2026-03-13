<script lang="ts">
  /**
   * Lens homepage — dashboard overview of the component library.
   *
   * Displays category cards, quick stats, and search CTA.
   * Data is self-contained via import.meta.glob (same pattern as [name]/+page.svelte).
   */
  import type { Num, Str } from '@/schemas/common';
  import type { LensMeta, CategoryGroup } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import { extractDir, toTitle, parseLensMeta } from '@/ui/lens/lens-utils.js';
  import { extractTokens, type ThemeTokenSet } from '@/ui/lens/extract-tokens.js';
  import { log } from '@/utils/core/logger';
  import Kbd from '@/ui/kbd/Kbd.svelte';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import type { Component } from 'svelte';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import SearchIcon from '@lucide/svelte/icons/search';
  import TextCursorInput from '@lucide/svelte/icons/text-cursor-input';
  import Layers2 from '@lucide/svelte/icons/layers-2';
  import Compass from '@lucide/svelte/icons/compass';
  import Eye from '@lucide/svelte/icons/eye';
  import Wrench from '@lucide/svelte/icons/wrench';
  import Microscope from '@lucide/svelte/icons/microscope';
  import Palette from '@lucide/svelte/icons/palette';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import List from '@lucide/svelte/icons/list';
  import { storageKey } from '$lib/config/app-meta';

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
        metaByName.set(dir, { ...result.data, tags: [...result.data.tags] });
      } else {
        log.warn(`Invalid lens.ts for "${dir}": ${result.error.message}`);
      }
    }
  }

  /** Category ordering and grouping. */
  const categoryOrder: Str[] = [
    'form',
    'layout',
    'overlay',
    'navigation',
    'display',
    'utility',
    'lens',
  ];

  /** Components grouped by category. */
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

  /** Category icon mapping. */
  const CATEGORY_ICONS: Record<Str, Component> = {
    form: TextCursorInput,
    layout: LayoutGrid,
    overlay: Layers2,
    navigation: Compass,
    display: Eye,
    utility: Wrench,
    lens: Microscope,
  };

  /** Category color mapping. */
  const CATEGORY_COLORS: Record<Str, Str> = {
    form: 'text-blue-600 dark:text-blue-400' as Str,
    layout: 'text-purple-600 dark:text-purple-400' as Str,
    overlay: 'text-amber-600 dark:text-amber-400' as Str,
    navigation: 'text-emerald-600 dark:text-emerald-400' as Str,
    display: 'text-rose-600 dark:text-rose-400' as Str,
    utility: 'text-slate-600 dark:text-slate-400' as Str,
    lens: 'text-primary' as Str,
  };

  /** Category descriptions. */
  const CATEGORY_DESCRIPTIONS: Record<Str, Str> = {
    form: 'Input controls, selectors, and form elements' as Str,
    layout: 'Structural components for page and content layout' as Str,
    overlay: 'Modals, dialogs, popovers, and floating UI' as Str,
    navigation: 'Menus, breadcrumbs, tabs, and wayfinding' as Str,
    display: 'Visual content presentation and data display' as Str,
    utility: 'Utility primitives and helper components' as Str,
    lens: 'Lens documentation system components' as Str,
  };

  /** Category background color mapping for card hover states. */
  const CATEGORY_BG: Record<Str, Str> = {
    form: 'hover:border-blue-500/30 dark:hover:border-blue-400/30' as Str,
    layout: 'hover:border-purple-500/30 dark:hover:border-purple-400/30' as Str,
    overlay: 'hover:border-amber-500/30 dark:hover:border-amber-400/30' as Str,
    navigation: 'hover:border-emerald-500/30 dark:hover:border-emerald-400/30' as Str,
    display: 'hover:border-rose-500/30 dark:hover:border-rose-400/30' as Str,
    utility: 'hover:border-slate-500/30 dark:hover:border-slate-400/30' as Str,
    lens: 'hover:border-primary/30' as Str,
  };

  /** Total design token count (sum across all theme sets). */
  const tokenCount: Num = (() => {
    const entries: Array<[Str, Str]> = Object.entries(cssRawModules);
    if (entries.length === 0) return 0 as Num;
    const [, css]: [Str, Str] = entries[0] as [Str, Str];
    const sets: ThemeTokenSet[] = extractTokens(css);
    return sets.reduce(
      (sum: Num, s: ThemeTokenSet): Num => (sum + s.tokens.length) as Num,
      0 as Num,
    );
  })();

  /** Number of documented components (have lens.ts metadata). */
  const documentedCount: Num = componentNames.filter((n: Str): boolean => metaByName.has(n))
    .length as Num;

  /** Documentation coverage percentage. */
  const documentedPercent: Num = (
    componentNames.length > 0 ? Math.round((documentedCount / componentNames.length) * 100) : 0
  ) as Num;

  /**
   * Open the ⌘K command search by dispatching the keyboard shortcut.
   * Dispatches on `document` because CommandSearch listens via `document.addEventListener`.
   */
  function openSearch(): void {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    );
  }

  /* ------------------------------------------------------------------ */
  /*  View mode toggle (grid / list)                                     */
  /* ------------------------------------------------------------------ */

  /** Current view mode for category display. */
  let viewMode: 'grid' | 'list' = $state('grid');

  // Restore view mode from localStorage on mount
  $effect(() => {
    try {
      const stored: Str | null = localStorage.getItem(storageKey('lens-view-mode'));
      if (stored === 'list' || stored === 'grid') {
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
</script>

<div class="flex flex-1 flex-col gap-8 overflow-y-auto p-6 md:p-10">
  <!-- Hero -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <LayoutGrid class="size-6 text-primary" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Lens</h1>
        <p class="text-sm text-muted-foreground">
          Component library documentation &amp; visual testing
        </p>
      </div>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <div class="rounded-lg border bg-card p-4" {...tipProps}>
            <div class="flex items-center gap-2 text-muted-foreground">
              <ComponentIcon class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Components</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{componentNames.length}</p>
          </div>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={4}>Total UI components discovered in @/ui</Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <div class="rounded-lg border bg-card p-4" {...tipProps}>
            <div class="flex items-center gap-2 text-muted-foreground">
              <LayoutGrid class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Categories</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{groupedComponents.length}</p>
          </div>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={4}>
        Component groups: form, layout, overlay, navigation, display, utility
      </Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <div class="rounded-lg border bg-card p-4" {...tipProps}>
            <div class="flex items-center gap-2 text-muted-foreground">
              <Palette class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Tokens</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{tokenCount}</p>
          </div>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={4}>
        CSS custom properties extracted from app.css across all themes
      </Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <div class="rounded-lg border bg-card p-4" {...tipProps}>
            <div class="flex items-center gap-2 text-muted-foreground">
              <CircleCheck class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Documented</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{documentedPercent}%</p>
            <p class="text-xs text-muted-foreground">{documentedCount}/{componentNames.length}</p>
          </div>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={4}>
        Components with a lens.ts metadata file for docs generation
      </Tooltip.Content>
    </Tooltip.Root>
  </div>

  <!-- Search CTA -->
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    onclick={openSearch}
  >
    <SearchIcon class="size-4 shrink-0" />
    <span>Search components, props, variants...</span>
    <Kbd label="⌘K" class="ml-auto" />
  </button>

  <!-- Category Cards -->
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">Categories</h2>
      <div class="flex items-center rounded-md border bg-card p-0.5">
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: gridTip })}
              <button
                type="button"
                class={cn(
                  'flex size-7 items-center justify-center rounded-sm transition-colors',
                  viewMode === 'grid'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                {...gridTip}
                onclick={() => {
                  viewMode = 'grid';
                }}
              >
                <LayoutGrid class="size-3.5" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={4}>Grid view</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger>
            {#snippet child({ props: listTip })}
              <button
                type="button"
                class={cn(
                  'flex size-7 items-center justify-center rounded-sm transition-colors',
                  viewMode === 'list'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                {...listTip}
                onclick={() => {
                  viewMode = 'list';
                }}
              >
                <List class="size-3.5" />
              </button>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={4}>List view</Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>

    {#if viewMode === 'grid'}
      <!-- Grid view -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each groupedComponents as group (group.name)}
          {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
          {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
          {@const catBg = CATEGORY_BG[group.name] ?? ('hover:border-border' as Str)}
          {@const catDesc = CATEGORY_DESCRIPTIONS[group.name] ?? ('' as Str)}
          {@const docCount = group.components.filter((n) => metaByName.has(n)).length}
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
                  <h3 class="text-sm font-semibold group-hover/cat:text-primary">{group.label}</h3>
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
                <span class="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground/60"
                  >+{group.components.length - 8} more</span
                >
              {/if}
            </div>
            <!-- Documentation coverage bar -->
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger>
                {#snippet child({ props: barTipProps })}
                  <div class="flex items-center gap-2" {...barTipProps}>
                    <span class="text-[11px] text-muted-foreground/60">Documented</span>
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        class="h-full rounded-full bg-emerald-500 transition-all"
                        style="width: {group.components.length > 0
                          ? Math.round((docCount / group.components.length) * 100)
                          : 0}%"
                      ></div>
                    </div>
                    <span class="text-[11px] tabular-nums text-muted-foreground">
                      {docCount}/{group.components.length}
                    </span>
                  </div>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content sideOffset={4}>
                {docCount} of {group.components.length} components have lens.ts metadata
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List view -->
      <div class="rounded-lg border bg-card">
        {#each groupedComponents as group, gi (group.name)}
          {@const CatIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
          {@const catColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
          {@const docCount = group.components.filter((n) => metaByName.has(n)).length}
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
            <div class="flex items-center gap-4 text-xs text-muted-foreground">
              <span class="tabular-nums">{group.components.length}</span>
              <div class="flex items-center gap-1.5">
                <div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-emerald-500"
                    style="width: {group.components.length > 0
                      ? Math.round((docCount / group.components.length) * 100)
                      : 0}%"
                  ></div>
                </div>
                <span class="tabular-nums text-[10px]">{docCount}/{group.components.length}</span>
              </div>
            </div>
            <ArrowRight
              class="size-3.5 text-muted-foreground/30 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary"
            />
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Design Tokens link -->
  <a
    href="/tokens"
    class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
  >
    <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
      <Palette class="size-5 text-primary" />
    </div>
    <div class="flex-1">
      <h3 class="text-sm font-semibold">Design Tokens</h3>
      <p class="text-xs text-muted-foreground">
        {tokenCount} CSS custom properties across themes
      </p>
    </div>
  </a>
</div>
