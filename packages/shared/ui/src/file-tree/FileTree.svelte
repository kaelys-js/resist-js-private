<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FileTreePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FileTreeProps = v.InferOutput<typeof FileTreePropsSchema>;
</script>

<script lang="ts">
  /**
   * FileTree — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FileTree />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FileTreeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FileTreeProps = $derived.by(() => {
    const rawProps: FileTreeProps = stripSvelteProps(allProps);
    const result = safeParse(FileTreePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FileTreeProps;
  });
</script>

<div data-slot="file-tree" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
