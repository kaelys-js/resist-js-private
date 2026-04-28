<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FileUpload Svelte component — file picker for selecting
   * and uploading files via click or drag-and-drop. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FileUploadPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FileUpload. */
  export type FileUploadProps = v.InferOutput<typeof FileUploadPropsSchema>;
</script>

<script lang="ts">
  /**
   * FileUpload — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FileUpload />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FileUploadProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FileUploadProps = $derived.by(() => {
    const rawProps: FileUploadProps = stripSvelteProps(allProps);
    const result = safeParse(FileUploadPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FileUploadProps;
  });
</script>

<div data-slot="file-upload" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
