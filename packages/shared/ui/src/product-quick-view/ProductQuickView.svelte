<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductQuickViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ProductQuickView. */
  export type ProductQuickViewProps = v.InferOutput<typeof ProductQuickViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductQuickView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductQuickView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductQuickViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductQuickViewProps = $derived.by(() => {
    const rawProps: ProductQuickViewProps = stripSvelteProps(allProps);
    const result = safeParse(ProductQuickViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductQuickViewProps;
  });
</script>

<div data-slot="product-quick-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
