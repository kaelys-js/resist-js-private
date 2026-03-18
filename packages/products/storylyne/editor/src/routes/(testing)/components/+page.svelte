<script lang="ts">
  /**
   * Lens homepage — dashboard overview of the component library.
   *
   * Displays quick stats, compatibility alerts, activity feed, and
   * navigation cards to Categories, Design Tokens, and Icons pages.
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
  import Badge from '@/ui/badge/badge.svelte';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { getContext, type Component } from 'svelte';
  import {
    CATEGORY_ORDER,
    CATEGORY_ICONS,
    CATEGORY_COLORS,
    categoryLabel as catLabel,
  } from '$lib/config/lens-categories';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Palette from '@lucide/svelte/icons/palette';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import TagIcon from '@lucide/svelte/icons/tag';

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

  /** Number of fully compliant components (all 18 rules pass). */
  const compliantCount: Num = componentNames.filter(
    (n: Str): boolean => compatByName.get(n)?.compatible === true,
  ).length as Num;

  /** Compliance percentage. */
  const compliantPercent: Num = (
    componentNames.length > 0 ? Math.round((compliantCount / componentNames.length) * 100) : 0
  ) as Num;

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
</script>

<div class="w-full">
  <!-- Sticky header -->
  <div
    class="sticky top-(--header-height) z-10 flex flex-col gap-3 border-b bg-background px-6 pb-4 pt-6 md:px-10 md:pt-10"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <LayoutGrid class="size-6 text-primary" />
      </div>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">Lens</h1>
        <p class="text-sm text-muted-foreground">
          {componentNames.length} components across {groupedComponents.length} categories
        </p>
      </div>
    </div>
  </div>

  <!-- Page content with padding -->
  <div class="flex flex-col gap-8 px-6 py-6 md:px-10 md:py-8">
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

    <!-- Navigation Cards -->
    <div class="flex flex-col gap-3">
      <!-- All Components link -->
      <a
        href="/components/all"
        class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
      >
        <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <ComponentIcon class="size-5 text-primary" />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold group-hover:text-primary">All Components</h3>
          <p class="text-xs text-muted-foreground">
            Browse all {componentNames.length} components
          </p>
        </div>
        <ArrowRight
          class="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </a>

      <!-- Categories link -->
      <a
        href="/components/category"
        class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
      >
        <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <LayoutGrid class="size-5 text-primary" />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold group-hover:text-primary">Categories</h3>
          <p class="text-xs text-muted-foreground">
            {groupedComponents.length} categories with {componentNames.length} components
          </p>
        </div>
        <ArrowRight
          class="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </a>

      <!-- Tags link -->
      <a
        href="/components/tags"
        class="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
      >
        <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <TagIcon class="size-5 text-primary" />
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold group-hover:text-primary">Tags</h3>
          <p class="text-xs text-muted-foreground">
            {allTags.length} tags across components
          </p>
        </div>
        <ArrowRight
          class="size-4 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </a>

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
  </div>
</div>
