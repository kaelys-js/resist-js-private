<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BookmarkButton — toggleable bookmark / save button with
   * filled and outline states. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BookmarkButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BookmarkButton. */
  export type BookmarkButtonProps = v.InferOutput<typeof BookmarkButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * BookmarkButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BookmarkButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BookmarkButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BookmarkButtonProps = $derived.by(() => {
    const rawProps: BookmarkButtonProps = stripSvelteProps(allProps);
    const result = safeParse(BookmarkButtonPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BookmarkButtonProps;
  });
</script>

<div data-slot="bookmark-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
