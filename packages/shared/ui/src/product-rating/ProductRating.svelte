<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ProductRating Svelte component — star-based product rating
   * display. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductRatingPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ProductRating. */
  export type ProductRatingProps = v.InferOutput<typeof ProductRatingPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductRating — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductRating />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductRatingProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductRatingProps = $derived.by(() => {
    const rawProps: ProductRatingProps = stripSvelteProps(allProps);
    const result = safeParse(ProductRatingPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductRatingProps;
  });
</script>

<div data-slot="product-rating" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
