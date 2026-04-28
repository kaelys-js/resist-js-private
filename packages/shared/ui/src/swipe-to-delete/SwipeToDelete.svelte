<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SwipeToDelete Svelte component — list row variant that
   * reveals a delete action when swiped (iOS Mail style).
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SwipeToDeletePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SwipeToDelete. */
  export type SwipeToDeleteProps = v.InferOutput<typeof SwipeToDeletePropsSchema>;
</script>

<script lang="ts">
  /**
   * SwipeToDelete — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SwipeToDelete />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SwipeToDeleteProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SwipeToDeleteProps = $derived.by(() => {
    const rawProps: SwipeToDeleteProps = stripSvelteProps(allProps);
    const result = safeParse(SwipeToDeletePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SwipeToDeleteProps;
  });
</script>

<div data-slot="swipe-to-delete" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
