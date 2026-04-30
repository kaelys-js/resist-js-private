<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PinchToZoom Svelte component — pinch / scroll-to-zoom
   * gesture wrapper. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PinchToZoomPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PinchToZoom. */
  export type PinchToZoomProps = v.InferOutput<typeof PinchToZoomPropsSchema>;
</script>

<script lang="ts">
  /**
   * PinchToZoom — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PinchToZoom />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PinchToZoomProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PinchToZoomProps = $derived.by(() => {
    const rawProps: PinchToZoomProps = stripSvelteProps(allProps);
    const result = safeParse(PinchToZoomPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PinchToZoomProps;
  });
</script>

<div data-slot="pinch-to-zoom" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
