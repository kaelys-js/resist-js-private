<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ImageEditor Svelte component — image editor with crop /
   * rotate / filter operations. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImageEditorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ImageEditor. */
  export type ImageEditorProps = v.InferOutput<typeof ImageEditorPropsSchema>;
</script>

<script lang="ts">
  /**
   * ImageEditor — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ImageEditor />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImageEditorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImageEditorProps = $derived.by(() => {
    const rawProps: ImageEditorProps = stripSvelteProps(allProps);
    const result = safeParse(ImageEditorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImageEditorProps;
  });
</script>

<div data-slot="image-editor" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
