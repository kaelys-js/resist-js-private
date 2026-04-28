<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FileDialog Svelte component — desktop-style file open /
   * save dialog for selecting files or destinations. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FileDialogPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FileDialog. */
  export type FileDialogProps = v.InferOutput<typeof FileDialogPropsSchema>;
</script>

<script lang="ts">
  /**
   * FileDialog — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FileDialog />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FileDialogProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FileDialogProps = $derived.by(() => {
    const rawProps: FileDialogProps = stripSvelteProps(allProps);
    const result = safeParse(FileDialogPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FileDialogProps;
  });
</script>

<div data-slot="file-dialog" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
