<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ProductReviews Svelte component — list of customer reviews
   * for a product. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductReviewsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ProductReviews. */
  export type ProductReviewsProps = v.InferOutput<typeof ProductReviewsPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductReviews — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductReviews />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductReviewsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductReviewsProps = $derived.by(() => {
    const rawProps: ProductReviewsProps = stripSvelteProps(allProps);
    const result = safeParse(ProductReviewsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductReviewsProps;
  });
</script>

<div data-slot="product-reviews" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
