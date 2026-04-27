<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImageCropperPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ImageCropper. */
  export type ImageCropperProps = v.InferOutput<typeof ImageCropperPropsSchema>;
</script>

<script lang="ts">
  /**
   * ImageCropper — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ImageCropper />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImageCropperProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImageCropperProps = $derived.by(() => {
    const rawProps: ImageCropperProps = stripSvelteProps(allProps);
    const result = safeParse(ImageCropperPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImageCropperProps;
  });
</script>

<div data-slot="image-cropper" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
