<script lang="ts">
  /**
   * Lens homepage — dashboard overview of the component library.
   *
   * Displays category cards, quick stats, and search CTA.
   * Data is self-contained via import.meta.glob (same pattern as [name]/+page.svelte).
   */
  import type { Num, Str } from '@/schemas/common';
  import type { LensMeta, LensStatus, CategoryGroup } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    type LensCompatibility,
  } from '@/ui/lens/lens-utils.js';
  import { extractTokens, type ThemeTokenSet } from '@/ui/lens/extract-tokens.js';
  import { log } from '@/utils/core/logger';
  import Kbd from '@/ui/kbd/Kbd.svelte';
  import Badge from '@/ui/badge/badge.svelte';
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
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Palette from '@lucide/svelte/icons/palette';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import List from '@lucide/svelte/icons/list';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import TagIcon from '@lucide/svelte/icons/tag';
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
    if (entries.length === 0) return 0 as Num;
    const [, css]: [Str, Str] = entries[0] as [Str, Str];
    const sets: ThemeTokenSet[] = extractTokens(css);
    return sets.reduce(
      (sum: Num, s: ThemeTokenSet): Num => (sum + s.tokens.length) as Num,
      0 as Num,
    );
  })();

  /* ------------------------------------------------------------------ */
  /*  Lens compatibility data from parent layout (via Svelte context)    */
  /* ------------------------------------------------------------------ */

  /** Lens compatibility results per component, set by +layout.svelte. */
  const compatByName: Map<Str, LensCompatibility> = getContext('lens-compat-by-name');

  /** Short rule descriptions for all 18 Lens compatibility rules (R0–R17). */
  const lensRuleNames: readonly Str[] = getContext('lens-rule-names');

  /** Number of fully compliant components (all 18 rules pass). */
  const compliantCount: Num = componentNames.filter(
    (n: Str): boolean => compatByName.get(n)?.compatible === true,
  ).length as Num;

  /** Compliance percentage. */
  const compliantPercent: Num = (
    componentNames.length > 0 ? Math.round((compliantCount / componentNames.length) * 100) : 0
  ) as Num;

  /** Components with at least one lens rule violation, sorted by violation count descending. */
  const incompatibleComponents: Array<{ name: Str; compat: LensCompatibility }> = componentNames
    .filter((n: Str): boolean => {
      const c: LensCompatibility | undefined = compatByName.get(n);
      return c !== undefined && !c.compatible;
    })
    .map((n: Str): { name: Str; compat: LensCompatibility } => ({
      name: n,
      compat: compatByName.get(n) as LensCompatibility, // safe — filtered above
    }))
    .toSorted(
      (a: { compat: LensCompatibility }, b: { compat: LensCompatibility }): Num =>
        (b.compat.violations.length - a.compat.violations.length) as Num,
    );

  /* ------------------------------------------------------------------ */
  /*  Tags                                                               */
  /* ------------------------------------------------------------------ */

  /** All unique tags across all documented components, sorted alphabetically. */
  const allTags: Str[] = [
    ...new Set([...metaByName.values()].flatMap((m: LensMeta): Str[] => m.tags)),
  ].toSorted();

  /** Status icon mapping. */
  const STATUS_ICONS: Record<LensStatus, Component> = {
    new: Sparkles,
    updated: RefreshCw,
    deprecated: Trash2,
  };

  /** Status color mapping. */
  const STATUS_COLORS: Record<LensStatus, Str> = {
    new: 'text-emerald-600 dark:text-emerald-400' as Str,
    updated: 'text-blue-600 dark:text-blue-400' as Str,
    deprecated: 'text-red-600 dark:text-red-400' as Str,
  };

  /** Status badge colors. */
  const STATUS_BADGE_COLORS: Record<LensStatus, Str> = {
    new: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' as Str,
    updated: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' as Str,
    deprecated: 'bg-red-500/15 text-red-700 dark:text-red-400' as Str,
  };

  /** Activity feed — components with a status (new, updated, deprecated). */
  const activityEntries: Array<{ name: Str; meta: LensMeta }> = componentNames
    .filter((n: Str): boolean => {
      const m: LensMeta | undefined = metaByName.get(n);
      return m?.status !== undefined;
    })
    .map((n: Str): { name: Str; meta: LensMeta } => ({
      name: n,
      meta: metaByName.get(n) as LensMeta, // safe — filtered above
    }));

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
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
      <Tooltip.Content sideOffset={4} portalProps={{ disabled: true }}
        >Total UI components discovered in @/ui</Tooltip.Content
      >
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
      <Tooltip.Content
        side="top"
        sideOffset={4}
        class="max-h-96 overflow-y-auto p-3"
        portalProps={{ disabled: true }}
      >
        <div class="flex flex-col gap-1.5">
          {#each groupedComponents as group (group.name)}
            {@const DotIcon = CATEGORY_ICONS[group.name] ?? ComponentIcon}
            {@const dotColor = CATEGORY_COLORS[group.name] ?? ('text-muted-foreground' as Str)}
            <div class="flex items-center gap-2 text-xs">
              <DotIcon class="size-3 shrink-0 {dotColor}" />
              <span class="capitalize">{group.name}</span>
              <span class="text-muted-foreground">({group.components.length})</span>
            </div>
          {/each}
        </div>
      </Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <div class="rounded-lg border bg-card p-4" {...tipProps}>
            <div class="flex items-center gap-2 text-muted-foreground">
              <TagIcon class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Tags</span>
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{allTags.length}</p>
          </div>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content
        side="top"
        sideOffset={4}
        class="max-h-96 overflow-y-auto p-3"
        portalProps={{ disabled: true }}
      >
        <div class="grid grid-cols-5 gap-1.5">
          {#each allTags as tag (tag)}
            <span
              class="inline-flex items-center gap-0.5 rounded bg-primary-foreground/20 px-1.5 py-1 text-xs"
              ><TagIcon class="size-3 shrink-0 opacity-60" />{tag}</span
            >
          {/each}
        </div>
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
      <Tooltip.Content sideOffset={4} portalProps={{ disabled: true }}>
        CSS custom properties extracted from app.css across all themes
      </Tooltip.Content>
    </Tooltip.Root>
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger>
        {#snippet child({ props: tipProps })}
          <div class="rounded-lg border bg-card p-4" {...tipProps}>
            <div class="flex items-center gap-2 text-muted-foreground">
              <CircleCheck class="size-4" />
              <span class="text-xs font-medium uppercase tracking-wider">Compatible</span>
            </div>
            <p
              class="mt-2 text-2xl font-bold tabular-nums {compliantPercent >= 80
                ? 'text-emerald-600 dark:text-emerald-400'
                : compliantPercent >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'}"
            >
              {compliantPercent}%
            </p>
            <p
              class="text-xs {compliantPercent >= 80
                ? 'text-emerald-600/70 dark:text-emerald-400/70'
                : compliantPercent >= 50
                  ? 'text-amber-600/70 dark:text-amber-400/70'
                  : 'text-red-600/70 dark:text-red-400/70'}"
            >
              {compliantCount}/{componentNames.length}
            </p>
          </div>
        {/snippet}
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={4} portalProps={{ disabled: true }}>
        {compliantCount} out of {componentNames.length} components are compatible
      </Tooltip.Content>
    </Tooltip.Root>
  </div>

  <!-- Incompatible Components Alert -->
  {#if incompatibleComponents.length > 0}
    <div class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div class="flex items-start gap-3">
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div class="flex-1">
          <p class="text-sm font-medium text-amber-700 dark:text-amber-300">
            {incompatibleComponents.length} incompatible component{incompatibleComponents.length ===
            1
              ? ''
              : 's'}
          </p>
          <p class="mt-1 text-xs text-amber-600/80 dark:text-amber-400/70">
            Failing one or more compatibility rules.
          </p>
          <div class="mt-2.5 flex flex-wrap gap-1">
            {#each incompatibleComponents.slice(0, 12) as entry (entry.name)}
              {@const failedRules = new Set(entry.compat.violations.map((vi) => vi.rule as number))}
              {@const failCount = failedRules.size}
              {@const passCount = lensRuleNames.length - failCount}
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: compTip })}
                    <a
                      href="/components/{entry.name}"
                      class="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
                      {...compTip}
                    >
                      <TriangleAlert class="size-2.5" />
                      {toTitle(entry.name)}
                      <span class="opacity-60">({failCount})</span>
                    </a>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content
                  side="bottom"
                  sideOffset={4}
                  class="max-w-72"
                  portalProps={{ disabled: true }}
                >
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
                </Tooltip.Content>
              </Tooltip.Root>
            {/each}
            {#if incompatibleComponents.length > 12}
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger>
                  {#snippet child({ props: moreTip })}
                    <span
                      class="cursor-default rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-600/60 dark:text-amber-400/50"
                      {...moreTip}
                    >
                      +{incompatibleComponents.length - 12} more
                    </span>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content
                  side="top"
                  sideOffset={4}
                  class="max-h-96 max-w-80 overflow-y-auto p-3"
                  portalProps={{ disabled: true }}
                >
                  <div class="flex flex-col gap-1.5">
                    {#each incompatibleComponents.slice(12) as overflow (overflow.name)}
                      <div class="flex items-center gap-2 text-xs">
                        <TriangleAlert class="size-3 shrink-0 text-amber-500" />
                        <span class="font-medium">{toTitle(overflow.name)}</span>
                        <span class="text-muted-foreground">
                          ({overflow.compat.violations.length} violation{overflow.compat.violations
                            .length === 1
                            ? ''
                            : 's'})
                        </span>
                      </div>
                    {/each}
                  </div>
                </Tooltip.Content>
              </Tooltip.Root>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Activity Feed / Changelog -->
  {#if activityEntries.length > 0}
    <div>
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Recent Changes
      </h2>
      <div class="rounded-lg border bg-card">
        {#each activityEntries as entry, i (entry.name)}
          {@const status = entry.meta.status}
          {#if status}
            {@const StatusIcon = STATUS_ICONS[status]}
            {@const statusColor = STATUS_COLORS[status]}
            {@const badgeColor = STATUS_BADGE_COLORS[status]}
            {#if i > 0}
              <div class="border-t"></div>
            {/if}
            <a
              href="/components/{entry.name}"
              class="group/entry flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
            >
              <StatusIcon class="size-4 shrink-0 {statusColor}" />
              <span class="text-sm font-medium group-hover/entry:text-primary">
                {toTitle(entry.name)}
              </span>
              <Badge variant="secondary" class="text-[10px] {badgeColor}">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              {#if entry.meta.description}
                <span class="hidden text-xs text-muted-foreground sm:inline">
                  {entry.meta.description}
                </span>
              {/if}
              <ArrowRight
                class="ml-auto size-3.5 shrink-0 text-muted-foreground/30 transition-transform group-hover/entry:translate-x-0.5 group-hover/entry:text-primary"
              />
            </a>
          {/if}
        {/each}
      </div>
    </div>
  {/if}

  <!-- Search CTA -->
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    onclick={openSearch}
  >
    <SearchIcon class="size-4 shrink-0" />
    <span>Search...</span>
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
          <Tooltip.Content sideOffset={4} portalProps={{ disabled: true }}
            >Grid view</Tooltip.Content
          >
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
          <Tooltip.Content sideOffset={4} portalProps={{ disabled: true }}
            >List view</Tooltip.Content
          >
        </Tooltip.Root>
      </div>
    </div>

    {#if viewMode === 'grid'}
      <!-- Grid view -->
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each groupedComponents as group (group.name)}
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
    {:else}
      <!-- List view -->
      <div class="rounded-lg border bg-card">
        {#each groupedComponents as group, gi (group.name)}
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

  <!-- Design Tokens link -->
  <a
    href="/tokens"
    class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
  >
    <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
      <Palette class="size-5 text-primary" />
    </div>
    <div class="flex-1">
      <h3 class="text-sm font-semibold group-hover:text-primary">Design Tokens</h3>
      <p class="text-xs text-muted-foreground">
        {tokenCount} CSS custom properties across themes
      </p>
    </div>
    <ArrowRight
      class="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
    />
  </a>
</div>
