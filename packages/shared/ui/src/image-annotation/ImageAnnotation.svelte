<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImageAnnotationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ImageAnnotationProps = v.InferOutput<typeof ImageAnnotationPropsSchema>;
</script>

<script lang="ts">
  /**
   * ImageAnnotation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ImageAnnotation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImageAnnotationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImageAnnotationProps = $derived.by(() => {
    const rawProps: ImageAnnotationProps = stripSvelteProps(allProps);
    const result = safeParse(ImageAnnotationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImageAnnotationProps;
  });
</script>

<div data-slot="image-annotation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
