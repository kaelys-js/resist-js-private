<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PdfViewer Svelte component — embedded PDF document
   * viewer. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PdfViewerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PdfViewer. */
  export type PdfViewerProps = v.InferOutput<typeof PdfViewerPropsSchema>;
</script>

<script lang="ts">
  /**
   * PdfViewer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PdfViewer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PdfViewerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PdfViewerProps = $derived.by(() => {
    const rawProps: PdfViewerProps = stripSvelteProps(allProps);
    const result = safeParse(PdfViewerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PdfViewerProps;
  });
</script>

<div data-slot="pdf-viewer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
