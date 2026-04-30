<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ReviewSummary Svelte component — aggregate average rating
   * with per-star bar breakdown for product/service reviews.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReviewSummaryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReviewSummary. */
  export type ReviewSummaryProps = v.InferOutput<typeof ReviewSummaryPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReviewSummary — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReviewSummary />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReviewSummaryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReviewSummaryProps = $derived.by(() => {
    const rawProps: ReviewSummaryProps = stripSvelteProps(allProps);
    const result = safeParse(ReviewSummaryPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReviewSummaryProps;
  });
</script>

<div data-slot="review-summary" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
