<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImageZoomPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ImageZoomProps = v.InferOutput<typeof ImageZoomPropsSchema>;
</script>

<script lang="ts">
  /**
   * ImageZoom — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ImageZoom />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImageZoomProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImageZoomProps = $derived.by(() => {
    const rawProps: ImageZoomProps = stripSvelteProps(allProps);
    const result = safeParse(ImageZoomPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImageZoomProps;
  });
</script>

<div data-slot="image-zoom" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
