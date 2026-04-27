<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReadingProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReadingProgress. */
  export type ReadingProgressProps = v.InferOutput<typeof ReadingProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReadingProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReadingProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReadingProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReadingProgressProps = $derived.by(() => {
    const rawProps: ReadingProgressProps = stripSvelteProps(allProps);
    const result = safeParse(ReadingProgressPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReadingProgressProps;
  });
</script>

<div data-slot="reading-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
