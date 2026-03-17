<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StreamingTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type StreamingTextProps = v.InferOutput<typeof StreamingTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * StreamingText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StreamingText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StreamingTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StreamingTextProps = $derived.by(() => {
    const rawProps: StreamingTextProps = stripSvelteProps(allProps);
    const result = safeParse(StreamingTextPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StreamingTextProps;
  });
</script>

<div data-slot="streaming-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
