<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SatisfactionRating Svelte component — CSAT score
   * display with smiley/face buttons or numeric scale.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SatisfactionRatingPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SatisfactionRating. */
  export type SatisfactionRatingProps = v.InferOutput<typeof SatisfactionRatingPropsSchema>;
</script>

<script lang="ts">
  /**
   * SatisfactionRating — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SatisfactionRating />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SatisfactionRatingProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SatisfactionRatingProps = $derived.by(() => {
    const rawProps: SatisfactionRatingProps = stripSvelteProps(allProps);
    const result = safeParse(SatisfactionRatingPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SatisfactionRatingProps;
  });
</script>

<div data-slot="satisfaction-rating" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
