<script module lang="ts">
  /**
   * LensPortalScope — scoped portal target for floating
   * content (popovers, tooltips) inside a Lens preview card,
   * keeping overlays anchored within the card boundary.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema, BoolSchema } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  export const LensPortalScopePropsSchema = v.strictObject({
    /** Per-card color mode. @values auto, light, dark, high-contrast */
    mode: v.picklist(['auto', 'light', 'dark', 'high-contrast']),
    /** Per-card theme id (empty string for default). @values midnight, ocean, forest */
    theme: StrSchema,
    /** Whether the page-level dark mode is active (for auto mode mirroring). @values true, false */
    pageIsDark: BoolSchema,
    /** Content to render inside the scoped portal context. */
    children: v.custom<Snippet>((val) => typeof val === 'function'),
  });
  /** Public component props for LensPortalScope. */
  export type LensPortalScopeProps = v.InferOutput<typeof LensPortalScopePropsSchema>;
</script>

<script lang="ts">
  /**
   * Scopes bits-ui portal targets so portaled overlays (tooltips, popovers,
   * dropdowns) inherit per-card theme/mode CSS variables.
   *
   * Creates a body-level `<div>` with matching `.dark`/`.lens-force-light`
   * class and `data-theme` attribute, then wraps children in `<BitsConfig>`
   * to route all portals there instead of bare `document.body`.
   */
  import type { Void } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { BitsConfig } from 'bits-ui';
  import { cn } from '../utils.js';

  const rawProps: LensPortalScopeProps = $props();
  const validated: LensPortalScopeProps = $derived.by(() => {
    const result = safeParse(LensPortalScopePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LensPortalScopeProps;
  });

  /** Portal target div — lives inside the card's transform container for containment. */
  let portalEl: HTMLDivElement | undefined = $state(undefined);
  /** Anchor element used to find the card container at mount time. */
  let anchorEl: HTMLDivElement | undefined = $state(undefined);

  $effect(() => {
    if (!anchorEl) {
      return;
    }
    const div: HTMLDivElement = document.createElement('div');
    // Position off-flow so it doesn't affect layout
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '0';
    div.style.height = '0';
    div.style.overflow = 'visible';
    div.style.pointerEvents = 'none';
    div.dataset.lensPortal = '';
    // Append inside the card's transform container (parent of this component)
    // so position:fixed portaled content is contained by the transform
    // SvelteKit editor tsconfig adds Body.append(string|Response|...) which conflicts
    // with ParentNode.append(Node) — use unknown cast to bypass
    (anchorEl as unknown as ParentNode).append(div);
    portalEl = div;

    return (): Void => {
      portalEl = undefined;
      div.remove();
    };
  });

  /** Sync mode class + data-theme attribute on the body-level portal div. */
  $effect(() => {
    if (!portalEl) {
      return;
    }
    // Reset classes — mirror page dark state when mode is auto + theme is set
    portalEl.className = cn(
      validated.mode === 'dark' && 'dark',
      validated.mode === 'light' && 'lens-force-light',
      validated.mode === 'high-contrast' && 'lens-high-contrast',
      validated.mode === 'auto' && validated.theme && validated.pageIsDark && 'dark',
      validated.mode === 'auto' && validated.theme && !validated.pageIsDark && 'lens-force-light',
    );
    // Sync theme attribute
    if (validated.theme) {
      portalEl.dataset.theme = validated.theme;
    } else {
      delete portalEl.dataset.theme;
    }
  });
</script>

<div bind:this={anchorEl} style="position: relative;">
  {#if portalEl}
    <BitsConfig defaultPortalTo={portalEl}>
      {@render validated.children()}
    </BitsConfig>
  {:else}
    {@render validated.children()}
  {/if}
</div>
