<script lang="ts">
  /**
   * Isolation page: renders a single component with applied toolbar state.
   *
   * Opened via "Open in new tab" from LensComponentRenderer cards.
   * Supports ?variant=key&option=value plus a ?s=base64JSON state param
   * that carries all computed toolbar styles.
   *
   * @module
   */
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Component } from 'svelte';
  import type { PropMeta } from '@/ui/lens/types.js';
  import { extractProps, extractDescription, buildBaseProps } from '@/ui/lens/extract-props.js';
  import {
    extractDir,
    extractStem,
    toTitle,
    isInternalFile,
    findPrimaryKey,
  } from '@/ui/lens/lens-utils.js';
  import { page } from '$app/state';
  import LensError from '@/ui/lens-error/LensError.svelte';
  import * as Tooltip from '@/ui/tooltip/index.js';

  /* ------------------------------------------------------------------ */
  /*  Globs                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Raw .svelte sources for prop/variant extraction.
   *
   * Eager for the Vite 7 + Svelte MIME type reason.
   */
  const rawSources: Record<Str, Str> = import.meta.glob('@/ui/*/*.svelte', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<Str, Str>;

  /** Live component modules for rendering. */
  const componentModules: Record<Str, () => Promise<unknown>> = import.meta.glob('@/ui/*/*.svelte');

  /* ------------------------------------------------------------------ */
  /*  Reactive state                                                    */
  /* ------------------------------------------------------------------ */

  const name: Str = $derived(page.params.name ?? '');
  const variantParam: Str = $derived(page.url.searchParams.get('variant') ?? '');
  const optionParam: Str = $derived(page.url.searchParams.get('option') ?? '');

  /** Screenshot mode: strips all chrome (title, centering, padding) for pixel-perfect capture. */
  const screenshotMode: Bool = $derived(page.url.searchParams.has('screenshot'));

  /** Decoded card styles from the `s` base64 JSON param. */
  const cardStyles: Record<Str, Str> = $derived.by((): Record<Str, Str> => {
    const raw: Str = page.url.searchParams.get('s') ?? '';

    if (!raw) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(atob(raw));

      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<Str, Str>;
      }
    } catch {
      /* Malformed state param — ignore and render defaults */
    }
    return {};
  });

  let PrimaryComponent: Component | null = $state(null);
  let props: PropMeta[] = $state([]);
  let componentDescription: Str = $state('');
  let loading: Bool = $state(true);
  let loadError: Str | null = $state(null);

  $effect(() => {
    const currentName: Str = name;
    let cancelled: Bool = false;

    PrimaryComponent = null;
    props = [];
    componentDescription = '';
    loading = true;
    loadError = null;

    if (!currentName) {
      loading = false;
      loadError = 'No component name specified.';
      return;
    }

    (async (): Promise<void> => {
      try {
        const sourceKey: Str | undefined = findPrimaryKey(currentName, rawSources);

        if (!sourceKey) {
          if (!cancelled) {
            loadError = `No source found for "${currentName}"`;
          }
          return;
        }

        const srcStr: Str = rawSources[sourceKey] ?? '';
        props = extractProps(srcStr);
        componentDescription = extractDescription(srcStr);

        const compKey: Str | undefined =
          Object.keys(componentModules).find(
            (k: Str): boolean =>
              extractDir(k) === currentName && extractStem(k) === currentName && !isInternalFile(k),
          ) ??
          Object.keys(componentModules).find(
            (k: Str): boolean => extractDir(k) === currentName && !isInternalFile(k),
          );

        if (compKey) {
          const mod: unknown = await componentModules[compKey]?.();

          if (cancelled) {
            return;
          }
          // Glob modules export { default: Component } — cast from unknown

          const m = mod as Record<Str, unknown>;
          PrimaryComponent = m.default as Component;
        } else if (!cancelled) {
          loadError = `Component "${currentName}" not found`;
        }
      } catch {
        /* Load failed — show error state instead of blank page */
        if (!cancelled) {
          loadError = `Failed to load component "${currentName}"`;
        }
      } finally {
        if (!cancelled) {
          loading = false;
        }
      }
    })();

    return (): void => {
      cancelled = true;
    };
  });

  const baseProps: Record<Str, unknown> = $derived(buildBaseProps(props));

  /** Build variant props from URL query params. */
  const variantProps: Record<Str, Str | boolean | number> = $derived.by(() => {
    if (!variantParam || !optionParam) {
      return {};
    }
    if (optionParam === 'true' || optionParam === 'false') {
      return { [variantParam]: optionParam === 'true' };
    }
    if (!Number.isNaN(Number(optionParam)) && optionParam !== '') {
      return { [variantParam]: Number(optionParam) };
    }
    return { [variantParam]: optionParam };
  });

  /* ------------------------------------------------------------------ */
  /*  Derived styles from cardStyles                                    */
  /* ------------------------------------------------------------------ */

  /** SVG filter ID for color vision simulation. */
  const filterId: Str = 'iso-sim-filter';

  /** Color mode class. */
  const modeClass: Str = $derived.by((): Str => {
    if (cardStyles.mode === 'dark') {
      return 'dark';
    }
    if (cardStyles.mode === 'light') {
      return 'lens-force-light';
    }
    return '';
  });

  /** Color-scheme style for correct system colours in light/dark. */
  const colorSchemeStyle: Str = $derived.by((): Str => {
    if (cardStyles.mode === 'light') {
      return 'color-scheme: light';
    }
    if (cardStyles.mode === 'dark') {
      return 'color-scheme: dark';
    }
    return '';
  });

  /** Inline styles for the outer container (background). */
  const containerStyle: Str = $derived(
    [cardStyles.bg ?? '', colorSchemeStyle].filter(Boolean).join('; '),
  );

  /** Inline styles for the content wrapper (zoom, orientation, outline, sim filter, font size). */
  const contentStyle: Str = $derived.by((): Str => {
    const parts: Str[] = [];

    if (cardStyles.zoom) {
      parts.push(cardStyles.zoom);
    }
    if (cardStyles.orient) {
      parts.push(cardStyles.orient);
    }
    if (cardStyles.outlineColor) {
      parts.push(`--lens-outline-color: ${cardStyles.outlineColor}`);
    }
    if (cardStyles.simMatrix) {
      parts.push(`filter: url(#${filterId})`);
    }
    if (cardStyles.simCss) {
      parts.push(`filter: ${cardStyles.simCss}`);
    }
    /* fontSize is stored as "14px (0.88x)" — extract the px value */
    if (cardStyles.fontSize) {
      const pxMatch: RegExpMatchArray | null = cardStyles.fontSize.match(/^(\d+(?:\.\d+)?)px/);

      if (pxMatch) {
        parts.push(`font-size: ${pxMatch[1]}px`);
      }
    }
    return parts.join('; ');
  });

  /** Text direction from card state, constrained to valid HTML dir values. */
  const textDir: 'auto' | 'ltr' | 'rtl' | undefined = $derived.by(
    (): 'auto' | 'ltr' | 'rtl' | undefined => {
      const d: Str = cardStyles.dir ?? '';

      if (d === 'rtl' || d === 'ltr' || d === 'auto') {
        return d;
      }
      return undefined;
    },
  );

  /** Viewport width × height from state. */
  const vpDimensions: { w: Num; h: Num } | null = $derived.by((): { w: Num; h: Num } | null => {
    const { vp } = cardStyles;

    if (!vp) {
      return null;
    }

    const [wStr, hStr] = vp.split('x');
    const w: Num = Number(wStr);
    const h: Num = Number(hStr);

    if (Number.isNaN(w) || Number.isNaN(h)) {
      return null;
    }
    return { w, h };
  });

  /** Media preference CSS classes. */
  const mediaPrefClasses: Str = $derived(cardStyles.mp ?? '');

  /** Debug outline class when enabled via accessibility toolbar. */
  const debugOutlineClass: Str = $derived(
    cardStyles.debugOutline === '1' ? 'lens-debug-outline' : '',
  );
</script>

<svelte:head>
  <title>{toTitle(name)} — Lens Isolation</title>
</svelte:head>

<div
  class="{screenshotMode
    ? 'inline-block'
    : 'flex min-h-svh items-center justify-center p-8'} {modeClass} {cardStyles.theme
    ? 'bg-background text-foreground'
    : 'bg-background'}"
  style={containerStyle}
  data-theme={cardStyles.theme || undefined}
  data-lens-ready={!loading && !loadError && PrimaryComponent ? '' : undefined}
>
  {#if cardStyles.simMatrix}
    <svg class="absolute size-0 overflow-hidden" aria-hidden="true">
      <defs>
        <filter id={filterId}>
          <feColorMatrix type="matrix" values={cardStyles.simMatrix} />
        </filter>
      </defs>
    </svg>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center">
      <div
        class="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
      ></div>
    </div>
  {:else if loadError}
    <LensError
      title={loadError}
      description="Check that the component exists and has a valid source file."
    />
  {:else if PrimaryComponent}
    <div class={screenshotMode ? '' : 'flex flex-col items-center gap-4'}>
      {#if !screenshotMode}
        <div class="text-xs text-muted-foreground">
          {toTitle(name)}
          {#if variantParam}
            <span class="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {variantParam}="{optionParam}"
            </span>
          {/if}
          {#if cardStyles.net}
            <span
              class="ml-1 rounded bg-yellow-500/10 px-1.5 py-0.5 font-mono text-[10px] text-yellow-600"
            >
              {cardStyles.net}
            </span>
          {/if}
        </div>
      {/if}
      {#if vpDimensions}
        <div
          class="overflow-auto {screenshotMode ? '' : 'border border-border'}"
          style="width: {vpDimensions.w}px; max-height: {vpDimensions.h}px"
        >
          <div
            class="relative {cardStyles.outlineColor
              ? 'lens-outline'
              : ''} {mediaPrefClasses} {debugOutlineClass}"
            style={contentStyle}
            dir={textDir}
          >
            <svelte:boundary>
              <Tooltip.Provider>
                <PrimaryComponent {...baseProps} {...variantProps}>Example</PrimaryComponent>
              </Tooltip.Provider>
              {#snippet failed(error: unknown)}
                <LensError
                  title="Render failed"
                  description={error instanceof Error
                    ? error.message
                    : typeof error === 'object' && error !== null && 'message' in error
                      ? String((error as Record<string, unknown>).message)
                      : String(error)}
                />
              {/snippet}
            </svelte:boundary>
          </div>
          {#if cardStyles.grid}
            <div class="pointer-events-none absolute inset-0" style={cardStyles.grid}></div>
          {/if}
        </div>
      {:else}
        <div
          class="relative {cardStyles.outlineColor
            ? 'lens-outline'
            : ''} {mediaPrefClasses} {debugOutlineClass}"
          style={contentStyle}
          dir={textDir}
        >
          <svelte:boundary>
            <Tooltip.Provider>
              <PrimaryComponent {...baseProps} {...variantProps}>Example</PrimaryComponent>
            </Tooltip.Provider>
            {#snippet failed(error: unknown)}
              <LensError
                title="Render failed"
                description={error instanceof Error
                  ? error.message
                  : typeof error === 'object' && error !== null && 'message' in error
                    ? String((error as Record<string, unknown>).message)
                    : String(error)}
              />
            {/snippet}
          </svelte:boundary>
        </div>
        {#if cardStyles.grid}
          <div class="pointer-events-none absolute inset-0" style={cardStyles.grid}></div>
        {/if}
      {/if}
      {#if cardStyles.tunnel}
        <div
          class="pointer-events-none absolute inset-0"
          style="background: radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.85) 60%)"
        ></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ── Lens visual treatment classes (mirrored from LensComponentRenderer) ── */

  :global(.lens-outline *) {
    outline: 1px solid var(--lens-outline-color, rgba(239, 68, 68, 0.25));
  }

  :global(.lens-reduced-motion *),
  :global(.lens-reduced-motion *::before),
  :global(.lens-reduced-motion *::after) {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  :global(.lens-contrast-more) {
    filter: contrast(1.5);
  }

  :global(.lens-contrast-less) {
    filter: contrast(0.75);
  }

  :global(.lens-reduced-transparency) {
    backdrop-filter: none !important;
  }

  :global(.lens-reduced-transparency *) {
    backdrop-filter: none !important;
    opacity: 1 !important;
  }

  :global(.lens-forced-colors) {
    background: Canvas !important;
    color: CanvasText !important;
    forced-color-adjust: none;
  }

  :global(.lens-forced-colors *) {
    color: CanvasText !important;
    background: Canvas !important;
    border-color: CanvasText !important;
    outline-color: CanvasText !important;
    fill: CanvasText !important;
    stroke: CanvasText !important;
  }

  :global(.lens-forced-colors a),
  :global(.lens-forced-colors a *) {
    color: LinkText !important;
  }

  :global(.lens-forced-colors button),
  :global(.lens-forced-colors [role='button']) {
    border: 2px solid ButtonText !important;
    color: ButtonText !important;
    background: ButtonFace !important;
  }

  /* ── Debug outline — color-coded element type outlines ── */

  :global(.lens-debug-outline article),
  :global(.lens-debug-outline nav),
  :global(.lens-debug-outline aside),
  :global(.lens-debug-outline section),
  :global(.lens-debug-outline header),
  :global(.lens-debug-outline footer),
  :global(.lens-debug-outline main) {
    outline: 1px solid rgba(59, 130, 246, 0.6) !important;
  }

  :global(.lens-debug-outline h1),
  :global(.lens-debug-outline h2),
  :global(.lens-debug-outline h3),
  :global(.lens-debug-outline h4),
  :global(.lens-debug-outline h5),
  :global(.lens-debug-outline h6) {
    outline: 1px solid rgba(99, 102, 241, 0.6) !important;
  }

  :global(.lens-debug-outline div) {
    outline: 1px solid rgba(147, 197, 253, 0.4) !important;
  }

  :global(.lens-debug-outline p),
  :global(.lens-debug-outline hr),
  :global(.lens-debug-outline pre),
  :global(.lens-debug-outline blockquote) {
    outline: 1px solid rgba(96, 165, 250, 0.5) !important;
  }

  :global(.lens-debug-outline ol),
  :global(.lens-debug-outline ul),
  :global(.lens-debug-outline li),
  :global(.lens-debug-outline dl),
  :global(.lens-debug-outline dt),
  :global(.lens-debug-outline dd) {
    outline: 1px solid rgba(239, 68, 68, 0.5) !important;
  }

  :global(.lens-debug-outline figure),
  :global(.lens-debug-outline img),
  :global(.lens-debug-outline iframe),
  :global(.lens-debug-outline video),
  :global(.lens-debug-outline audio),
  :global(.lens-debug-outline canvas),
  :global(.lens-debug-outline svg) {
    outline: 1px solid rgba(168, 85, 247, 0.6) !important;
  }

  :global(.lens-debug-outline table),
  :global(.lens-debug-outline thead),
  :global(.lens-debug-outline tbody),
  :global(.lens-debug-outline tfoot),
  :global(.lens-debug-outline tr),
  :global(.lens-debug-outline th),
  :global(.lens-debug-outline td),
  :global(.lens-debug-outline caption) {
    outline: 1px solid rgba(20, 184, 166, 0.5) !important;
  }

  :global(.lens-debug-outline button),
  :global(.lens-debug-outline input),
  :global(.lens-debug-outline select),
  :global(.lens-debug-outline textarea),
  :global(.lens-debug-outline form),
  :global(.lens-debug-outline fieldset),
  :global(.lens-debug-outline label),
  :global(.lens-debug-outline legend) {
    outline: 1px solid rgba(249, 115, 22, 0.6) !important;
  }

  :global(.lens-debug-outline a) {
    outline: 1px solid rgba(236, 72, 153, 0.5) !important;
  }

  :global(.lens-debug-outline em),
  :global(.lens-debug-outline strong),
  :global(.lens-debug-outline i),
  :global(.lens-debug-outline b),
  :global(.lens-debug-outline u),
  :global(.lens-debug-outline s),
  :global(.lens-debug-outline code),
  :global(.lens-debug-outline kbd),
  :global(.lens-debug-outline samp),
  :global(.lens-debug-outline var),
  :global(.lens-debug-outline mark),
  :global(.lens-debug-outline small),
  :global(.lens-debug-outline sub),
  :global(.lens-debug-outline sup),
  :global(.lens-debug-outline abbr),
  :global(.lens-debug-outline time),
  :global(.lens-debug-outline span) {
    outline: 1px solid rgba(244, 63, 94, 0.4) !important;
  }

  :global(.lens-force-light) {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.965 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.965 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.965 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.556 0 0);
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.965 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.556 0 0);
  }
</style>
