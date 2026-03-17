<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PanoramaViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PanoramaViewerProps = v.InferOutput<typeof PanoramaViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * PanoramaViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PanoramaViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PanoramaViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PanoramaViewerProps = $derived.by(() => {
    const rawProps: PanoramaViewerProps = stripSvelteProps(allProps);
    const result = safeParse(PanoramaViewerPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PanoramaViewerProps;
  });
</script>

<div data-slot="panorama-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
