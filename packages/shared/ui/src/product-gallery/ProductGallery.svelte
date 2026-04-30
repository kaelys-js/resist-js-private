<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ProductGallery Svelte component — product image gallery
   * with thumbnails. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProductGalleryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ProductGallery. */
  export type ProductGalleryProps = v.InferOutput<typeof ProductGalleryPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProductGallery — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProductGallery />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProductGalleryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProductGalleryProps = $derived.by(() => {
    const rawProps: ProductGalleryProps = stripSvelteProps(allProps);
    const result = safeParse(ProductGalleryPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProductGalleryProps;
  });
</script>

<div data-slot="product-gallery" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
