<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ThreadViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ThreadViewProps = v.InferOutput<typeof ThreadViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * ThreadView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ThreadView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ThreadViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ThreadViewProps = $derived.by(() => {
    const rawProps: ThreadViewProps = stripSvelteProps(allProps);
    const result = safeParse(ThreadViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ThreadViewProps;
  });
</script>

<div data-slot="thread-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
