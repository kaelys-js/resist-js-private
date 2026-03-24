<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ProductCardProps = v.InferOutput<typeof ProductCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductCardProps = $derived.by(() => {
    const rawProps: ProductCardProps = stripSvelteProps(allProps);
    const result = safeParse(ProductCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductCardProps;
  });
</script>

<div data-slot="product-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
