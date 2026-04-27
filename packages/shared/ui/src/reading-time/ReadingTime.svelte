<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReadingTimePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReadingTime. */
  export type ReadingTimeProps = v.InferOutput<typeof ReadingTimePropsSchema>;
</script>

<script lang="ts">
  /**
   * ReadingTime — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReadingTime />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReadingTimeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReadingTimeProps = $derived.by(() => {
    const rawProps: ReadingTimeProps = stripSvelteProps(allProps);
    const result = safeParse(ReadingTimePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReadingTimeProps;
  });
</script>

<div data-slot="reading-time" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
