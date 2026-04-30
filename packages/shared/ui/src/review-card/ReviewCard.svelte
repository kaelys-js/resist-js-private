<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ReviewCard Svelte component — single user review card
   * with author, rating, and review body. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReviewCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReviewCard. */
  export type ReviewCardProps = v.InferOutput<typeof ReviewCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReviewCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReviewCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReviewCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReviewCardProps = $derived.by(() => {
    const rawProps: ReviewCardProps = stripSvelteProps(allProps);
    const result = safeParse(ReviewCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReviewCardProps;
  });
</script>

<div data-slot="review-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
