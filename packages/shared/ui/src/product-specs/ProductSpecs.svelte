<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductSpecsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ProductSpecsProps = v.InferOutput<typeof ProductSpecsPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductSpecs — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductSpecs />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductSpecsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductSpecsProps = $derived.by(() => {
    const rawProps: ProductSpecsProps = stripSvelteProps(allProps);
    const result = safeParse(ProductSpecsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductSpecsProps;
  });
</script>

<div data-slot="product-specs" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
