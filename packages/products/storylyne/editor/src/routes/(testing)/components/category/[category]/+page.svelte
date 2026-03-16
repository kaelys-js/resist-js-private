<script lang="ts">
  /**
   * Category page — shows all components belonging to a single category.
   *
   * Displays a category header with icon, description, and a grid of component
   * cards with name, description, tags, documentation status, and links.
   * Data is self-contained via import.meta.glob (same pattern as other Lens pages).
   */
  import { page } from '$app/state';
  import type { Num, Str } from '@/schemas/common';
  import type { LensMeta, LensStatus } from '@/ui/lens/types.js';
  import type { Result } from '@/schemas/result/result';
  import {
    extractDir,
    toTitle,
    parseLensMeta,
    extractComponentDescription,
  } from '@/ui/lens/lens-utils.js';
  import { extractProps } from '@/ui/lens/extract-props.js';
  import { log } from '@/utils/core/logger';
  import Badge from '@/ui/badge/badge.svelte';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import { cn } from '@/ui/utils.js';
  import type { Component } from 'svelte';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import TextCursorInput from '@lucide/svelte/icons/text-cursor-input';
  import Layers2 from '@lucide/svelte/icons/layers-2';
  import Compass from '@lucide/svelte/icons/compass';
  import Eye from '@lucide/svelte/icons/eye';
  import Wrench from '@lucide/svelte/icons/wrench';
  import Microscope from '@lucide/svelte/icons/microscope';
  import ComponentIcon from '@lucide/svelte/icons/component';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Tag from '@lucide/svelte/icons/tag';

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
  const categoryLabel: Str = $derived(
    category.length > 0
      ? ((category.charAt(0).toUpperCase() + category.slice(1)) as Str)
      : ('' as Str),
  );

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

  /** Category color mapping (icon + badge). */
  const CATEGORY_COLORS: Record<Str, Str> = {
    form: 'text-blue-600 dark:text-blue-400' as Str,
    layout: 'text-purple-600 dark:text-purple-400' as Str,
    overlay: 'text-amber-600 dark:text-amber-400' as Str,
    navigation: 'text-emerald-600 dark:text-emerald-400' as Str,
    display: 'text-rose-600 dark:text-rose-400' as Str,
    utility: 'text-slate-600 dark:text-slate-400' as Str,
    lens: 'text-primary' as Str,
  };

  /** Category background accent mapping. */
  const CATEGORY_BG: Record<Str, Str> = {
    form: 'bg-blue-500/10' as Str,
    layout: 'bg-purple-500/10' as Str,
    overlay: 'bg-amber-500/10' as Str,
    navigation: 'bg-emerald-500/10' as Str,
    display: 'bg-rose-500/10' as Str,
    utility: 'bg-slate-500/10' as Str,
    lens: 'bg-primary/10' as Str,
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

  /**
   * Get the prop count for a component from its source.
   *
   * @param name - Component directory name
   * @returns Number of props
   */
  function getPropCount(name: Str): Num {
    const sources: Str[] = Object.entries(rawSources)
      .filter(([k]: [Str, Str]): boolean => extractDir(k) === name)
      .map(([, v]: [Str, Str]): Str => v);
    if (sources.length === 0) return 0 as Num;
    let count: Num = 0 as Num;
    for (const src of sources) {
      count = (count + extractProps(src).length) as Num;
    }
    return count;
  }

  /** Resolved category icon. */
  const CatIcon: Component = $derived(CATEGORY_ICONS[category] ?? ComponentIcon);

  /** Resolved category color class. */
  const catColor: Str = $derived(CATEGORY_COLORS[category] ?? ('text-muted-foreground' as Str));

  /** Resolved category background class. */
  const catBg: Str = $derived(CATEGORY_BG[category] ?? ('bg-muted' as Str));

  /** Resolved category description. */
  const catDesc: Str = $derived(CATEGORY_DESCRIPTIONS[category] ?? ('' as Str));

  /** Number of documented components in this category. */
  const documentedCount: Num = $derived(
    categoryComponents.filter((n: Str): boolean => metaByName.has(n)).length as Num,
  );
</script>

<div class="flex flex-1 flex-col gap-8 overflow-y-auto p-6 md:p-10">
  <!-- Category Header -->
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <div class={cn('flex size-12 items-center justify-center rounded-xl', catBg)}>
        <svelte:component this={CatIcon} class="size-6 {catColor}" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{categoryLabel}</h1>
        {#if catDesc}
          <p class="text-sm text-muted-foreground">{catDesc}</p>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-3 text-sm text-muted-foreground">
      <span class="tabular-nums">{categoryComponents.length} components</span>
      <span class="text-border">·</span>
      <span class="tabular-nums">{documentedCount} documented</span>
    </div>
  </div>

  <!-- Component Grid -->
  {#if categoryComponents.length === 0}
    <div class="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <ComponentIcon class="size-10 text-muted-foreground/30" strokeWidth={1.5} />
      <p class="text-sm">No components found in this category.</p>
    </div>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each categoryComponents as name (name)}
        {@const meta = metaByName.get(name)}
        {@const desc = getDescription(name)}
        {@const propCount = getPropCount(name)}
        {@const isDocumented = metaByName.has(name)}
        <a
          href="/components/{name}"
          class="group flex flex-col gap-2.5 rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <svelte:component this={CatIcon} class="size-4 {catColor}" />
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
                  {#snippet child({ props: docTip })}
                    <span {...docTip}>
                      {#if isDocumented}
                        <CircleCheck class="size-4 text-emerald-500" />
                      {:else}
                        <CircleX class="size-4 text-muted-foreground/30" />
                      {/if}
                    </span>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content sideOffset={4}>
                  {isDocumented ? 'Has lens.ts documentation' : 'No lens.ts metadata'}
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
                    class="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <Tag class="size-3" />
                    {tag}
                  </span>
                {/each}
                {#if meta.tags.length > 3}
                  <span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground/60">
                    +{meta.tags.length - 3}
                  </span>
                {/if}
              {/if}
            </div>
            <div class="flex items-center gap-2 text-[10px] text-muted-foreground/60">
              {#if (propCount as number) > 0}
                <span class="tabular-nums">{propCount} props</span>
              {/if}
              <ArrowRight
                class="size-3.5 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </div>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
