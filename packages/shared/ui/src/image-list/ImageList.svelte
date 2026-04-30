<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ImageList Svelte component — gallery-grid display of an
   * image collection. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImageListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ImageList. */
  export type ImageListProps = v.InferOutput<typeof ImageListPropsSchema>;
</script>

<script lang="ts">
  /**
   * ImageList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ImageList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImageListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImageListProps = $derived.by(() => {
    const rawProps: ImageListProps = stripSvelteProps(allProps);
    const result = safeParse(ImageListPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImageListProps;
  });
</script>

<div data-slot="image-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
