<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StreamGraphPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StreamGraph. */
  export type StreamGraphProps = v.InferOutput<typeof StreamGraphPropsSchema>;
</script>

<script lang="ts">
  /**
   * StreamGraph — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StreamGraph />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StreamGraphProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StreamGraphProps = $derived.by(() => {
    const rawProps: StreamGraphProps = stripSvelteProps(allProps);
    const result = safeParse(StreamGraphPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StreamGraphProps;
  });
</script>

<div data-slot="stream-graph" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
