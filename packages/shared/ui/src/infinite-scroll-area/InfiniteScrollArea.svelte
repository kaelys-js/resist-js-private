<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * InfiniteScrollArea Svelte component — container that
   * continuously scrolls content in a loop, used for logo bars,
   * testimonials, or content feeds. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const InfiniteScrollAreaPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for InfiniteScrollArea. */
  export type InfiniteScrollAreaProps = v.InferOutput<typeof InfiniteScrollAreaPropsSchema>;
</script>

<script lang="ts">
  /**
   * InfiniteScrollArea — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <InfiniteScrollArea />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = InfiniteScrollAreaProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: InfiniteScrollAreaProps = $derived.by(() => {
    const rawProps: InfiniteScrollAreaProps = stripSvelteProps(allProps);
    const result = safeParse(InfiniteScrollAreaPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as InfiniteScrollAreaProps;
  });
</script>

<div data-slot="infinite-scroll-area" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
