<script lang="ts">
  /**
   * Icons — searchable Lucide icon gallery.
   *
   * Displays a responsive grid of all available Lucide icons with
   * search filtering, size/stroke controls, and a detail panel
   * showing import statement and usage example.
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import CopyButton from '@/ui/copy-button/CopyButton.svelte';
  import LensEmpty from '@/ui/lens-empty/LensEmpty.svelte';
  import Search from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import type { Component } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import type { IconsData } from './+page.server.js';

  const { data }: { data: IconsData } = $props();

  /** Search query for filtering icons. */
  let searchQuery: Str = $state('' as Str);

  /** Preview icon size (px). */
  let previewSize: Num = $state(24 as Num);

  /** Preview stroke width. */
  let strokeWidth: Num = $state(2 as Num);

  /** Currently selected icon name (null = no selection). */
  let selectedIcon: Str | null = $state(null);

  /** Cache of loaded icon components. */
  const iconCache: Map<Str, Component> = new Map();

  /** Set of icons currently being loaded. */
  const loadingIcons: Set<Str> = new Set();

  /** Reactive trigger for icon loading — incremented when new icons finish loading. */
  let loadTick: Num = $state(0 as Num);

  /** Filtered icon names based on search. */
  const filteredNames: Str[] = $derived.by((): Str[] => {
    if (searchQuery.length === 0) return data.names;
    const q: Str = searchQuery.toLowerCase() as Str;
    return data.names.filter((name) => name.toLowerCase().includes(q)) as Str[];
  });

  /** Number of visible icons (pagination). */
  let visibleCount: Num = $state(150 as Num);

  /** Icons to display (paginated). */
  const displayNames: Str[] = $derived(filteredNames.slice(0, visibleCount as number) as Str[]);

  /** Whether there are more icons to show. */
  const hasMore: Bool = $derived((visibleCount as number) < filteredNames.length);

  /** Import statement for the selected icon. */
  const importStatement: Str = $derived.by((): Str => {
    if (!selectedIcon) return '' as Str;
    const pascal: Str = selectedIcon
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') as Str;
    return `import ${pascal} from '@lucide/svelte/icons/${selectedIcon}';` as Str;
  });

  /** Usage example for the selected icon. */
  const usageExample: Str = $derived.by((): Str => {
    if (!selectedIcon) return '' as Str;
    const pascal: Str = selectedIcon
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') as Str;
    return `<${pascal} class="size-4" />` as Str;
  });

  /**
   * Load an icon component dynamically.
   *
   * @param name - Kebab-case icon name
   */
  async function loadIcon(name: Str): Promise<void> {
    if (iconCache.has(name) || loadingIcons.has(name)) return;
    loadingIcons.add(name);

    try {
      const mod = await import(`@lucide/svelte/icons/${name}`);
      iconCache.set(name, mod.default as Component);
      loadTick = ((loadTick as number) + 1) as Num;
    } catch {
      /* Icon import failed — dynamic import path may not resolve for this icon */
    } finally {
      loadingIcons.delete(name);
    }
  }

  /**
   * Get a cached icon component (returns undefined if not loaded yet).
   *
   * @param name - Icon name
   * @returns Component or undefined
   */
  function getIcon(name: Str): Component | undefined {
    /* Reference loadTick to trigger reactive updates when icons finish loading */
    const _tick: Num = loadTick;
    return iconCache.get(name);
  }

  /**
   * Handle icon card click — select and load the icon.
   *
   * @param name - Icon name
   */
  async function selectIcon(name: Str): Promise<void> {
    selectedIcon = selectedIcon === name ? null : name;
    if (selectedIcon) {
      await loadIcon(selectedIcon);
    }
  }

  /** Load more icons. */
  function showMore(): void {
    visibleCount = ((visibleCount as number) + 150) as Num;
  }

  /**
   * Svelte action to lazy-load icons as they scroll into view.
   *
   * @param node - The icon card element with a data-icon attribute
   * @returns Svelte action destroy handler
   */
  function observeIcon(node: HTMLElement): { destroy: () => void } {
    const name: Str = node.dataset['icon'] as Str;
    const observer: IntersectionObserver = new IntersectionObserver(
      async (entries) => {
        const visible: IntersectionObserverEntry[] = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          await loadIcon(name);
          observer.unobserve(node);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return {
      destroy(): void {
        observer.disconnect();
      },
    };
  }
</script>

<div class="mx-auto max-w-6xl space-y-6 p-8">
  <!-- Page header -->
  <div>
    <h1 class="text-3xl font-bold tracking-tight">Icons</h1>
    <p class="mt-2 text-muted-foreground">
      {data.names.length} Lucide icons available in the library.
    </p>
  </div>

  <!-- Controls bar -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <!-- Search -->
    <div class="relative flex-1">
      <Search
        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder="Search icons..."
        class="w-full rounded-lg border bg-card py-2 pl-10 pr-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

    <!-- Size + Stroke controls -->
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-xs text-muted-foreground">
        Size
        <input
          type="range"
          min="16"
          max="48"
          step="4"
          bind:value={previewSize}
          class="h-1.5 w-20 cursor-pointer accent-primary"
        />
        <span class="w-6 text-right font-mono text-[10px]">{previewSize}</span>
      </label>
      <label class="flex items-center gap-2 text-xs text-muted-foreground">
        Stroke
        <input
          type="range"
          min="1"
          max="3"
          step="0.5"
          bind:value={strokeWidth}
          class="h-1.5 w-20 cursor-pointer accent-primary"
        />
        <span class="w-6 text-right font-mono text-[10px]">{strokeWidth}</span>
      </label>
    </div>
  </div>

  <!-- Match count -->
  {#if searchQuery}
    <p class="text-xs text-muted-foreground" transition:fade={{ duration: 150 }}>
      {filteredNames.length}
      {filteredNames.length === 1 ? 'icon' : 'icons'} matching "{searchQuery}"
    </p>
  {/if}

  <!-- Detail panel (selected icon) -->
  {#if selectedIcon}
    <div class="rounded-lg border bg-card p-6" transition:slide={{ duration: 200 }}>
      <div class="flex items-start gap-6">
        <!-- Large preview -->
        <div
          class="flex shrink-0 items-center justify-center rounded-lg border bg-muted/30"
          style="width: 80px; height: 80px;"
        >
          {#if getIcon(selectedIcon)}
            {@const IconComp = getIcon(selectedIcon)}
            {#if IconComp}
              <IconComp size={48} {strokeWidth} />
            {/if}
          {:else}
            <div class="size-12 animate-pulse rounded bg-muted"></div>
          {/if}
        </div>

        <div class="min-w-0 flex-1 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-mono text-sm font-semibold">{selectedIcon}</h3>
            <button
              type="button"
              class="rounded p-1 text-muted-foreground hover:text-foreground"
              onclick={() => {
                selectedIcon = null;
              }}
              aria-label="Close detail panel"
            >
              <X class="size-4" />
            </button>
          </div>

          <!-- Import statement -->
          <div>
            <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Import
            </p>
            <div
              class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs"
            >
              <code class="flex-1 select-all truncate">{importStatement}</code>
              <CopyButton text={importStatement} label="Copy import" />
            </div>
          </div>

          <!-- Usage example -->
          <div>
            <p class="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Usage
            </p>
            <div
              class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs"
            >
              <code class="flex-1 select-all truncate">{usageExample}</code>
              <CopyButton text={usageExample} label="Copy usage" />
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Icon grid -->
  {#if filteredNames.length === 0}
    <LensEmpty title="No icons found" description="Try a different search term." />
  {:else}
    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {#each displayNames as name (name)}
        <button
          type="button"
          class="group flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all hover:border-primary/30 hover:bg-muted/50 {selectedIcon ===
          name
            ? 'border-primary bg-primary/5'
            : 'bg-card'}"
          onclick={() => selectIcon(name)}
          title={name}
          data-icon={name}
          use:observeIcon
        >
          <div
            class="flex items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground"
            style="width: {previewSize}px; height: {previewSize}px;"
          >
            {#if getIcon(name)}
              {@const IconComp = getIcon(name)}
              {#if IconComp}
                <IconComp size={previewSize} {strokeWidth} />
              {/if}
            {:else}
              <div
                class="animate-pulse rounded bg-muted"
                style="width: {(previewSize as number) * 0.6}px; height: {(previewSize as number) *
                  0.6}px;"
              ></div>
            {/if}
          </div>
          <span class="w-full truncate text-center text-[9px] text-muted-foreground">
            {name}
          </span>
        </button>
      {/each}
    </div>

    <!-- Load more -->
    {#if hasMore}
      <div class="flex justify-center pt-4">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onclick={showMore}
        >
          Show more ({filteredNames.length - (visibleCount as number)} remaining)
        </button>
      </div>
    {/if}
  {/if}
</div>
