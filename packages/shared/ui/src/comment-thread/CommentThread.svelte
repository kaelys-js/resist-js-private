<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CommentThread — nested comments / replies thread. Placeholder
   * shell awaiting full implementation; ships with a `class` prop
   * for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CommentThreadPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CommentThread. */
  export type CommentThreadProps = v.InferOutput<typeof CommentThreadPropsSchema>;
</script>

<script lang="ts">
  /**
   * CommentThread — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CommentThread />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CommentThreadProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CommentThreadProps = $derived.by(() => {
    const rawProps: CommentThreadProps = stripSvelteProps(allProps);
    const result = safeParse(CommentThreadPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CommentThreadProps;
  });
</script>

<div data-slot="comment-thread" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
