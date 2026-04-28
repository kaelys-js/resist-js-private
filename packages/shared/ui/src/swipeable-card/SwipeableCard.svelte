<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SwipeableCard Svelte component — Tinder-style stack card
   * dismissible by swiping left or right with rotation.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SwipeableCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SwipeableCard. */
  export type SwipeableCardProps = v.InferOutput<typeof SwipeableCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * SwipeableCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SwipeableCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SwipeableCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SwipeableCardProps = $derived.by(() => {
    const rawProps: SwipeableCardProps = stripSvelteProps(allProps);
    const result = safeParse(SwipeableCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SwipeableCardProps;
  });
</script>

<div data-slot="swipeable-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
