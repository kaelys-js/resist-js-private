<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductComparisonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ProductComparisonProps = v.InferOutput<typeof ProductComparisonPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductComparison — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductComparison />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductComparisonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductComparisonProps = $derived.by(() => {
    const rawProps: ProductComparisonProps = stripSvelteProps(allProps);
    const result = safeParse(ProductComparisonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductComparisonProps;
  });
</script>

<div data-slot="product-comparison" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
