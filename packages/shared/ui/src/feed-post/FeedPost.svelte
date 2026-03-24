<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FeedPostPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FeedPostProps = v.InferOutput<typeof FeedPostPropsSchema>;
</script>

<script lang="ts">
  /**
   * FeedPost — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FeedPost />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FeedPostProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FeedPostProps = $derived.by(() => {
    const rawProps: FeedPostProps = stripSvelteProps(allProps);
    const result = safeParse(FeedPostPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FeedPostProps;
  });
</script>

<div data-slot="feed-post" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
