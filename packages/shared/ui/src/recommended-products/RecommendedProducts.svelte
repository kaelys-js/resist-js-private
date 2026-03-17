<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RecommendedProductsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type RecommendedProductsProps = v.InferOutput<typeof RecommendedProductsPropsSchema>;
</script>

<script lang="ts">
  /**
   * RecommendedProducts — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RecommendedProducts />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RecommendedProductsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RecommendedProductsProps = $derived.by(() => {
    const rawProps: RecommendedProductsProps = stripSvelteProps(allProps);
    const result = safeParse(RecommendedProductsPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RecommendedProductsProps;
  });
</script>

<div data-slot="recommended-products" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
