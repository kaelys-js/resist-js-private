<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FileInput Svelte component — styled file selection input
   * with click-to-browse trigger. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FileInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FileInput. */
  export type FileInputProps = v.InferOutput<typeof FileInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * FileInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FileInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FileInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FileInputProps = $derived.by(() => {
    const rawProps: FileInputProps = stripSvelteProps(allProps);
    const result = safeParse(FileInputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FileInputProps;
  });
</script>

<div data-slot="file-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
