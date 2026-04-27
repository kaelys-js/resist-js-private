<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FileManagerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FileManager. */
  export type FileManagerProps = v.InferOutput<typeof FileManagerPropsSchema>;
</script>

<script lang="ts">
  /**
   * FileManager — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FileManager />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FileManagerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FileManagerProps = $derived.by(() => {
    const rawProps: FileManagerProps = stripSvelteProps(allProps);
    const result = safeParse(FileManagerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FileManagerProps;
  });
</script>

<div data-slot="file-manager" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
