<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FilePreview Svelte component — thumbnail preview card for
   * a single file with type-aware rendering (image / video /
   * document). Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FilePreviewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FilePreview. */
  export type FilePreviewProps = v.InferOutput<typeof FilePreviewPropsSchema>;
</script>

<script lang="ts">
  /**
   * FilePreview — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FilePreview />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FilePreviewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FilePreviewProps = $derived.by(() => {
    const rawProps: FilePreviewProps = stripSvelteProps(allProps);
    const result = safeParse(FilePreviewPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FilePreviewProps;
  });
</script>

<div data-slot="file-preview" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
