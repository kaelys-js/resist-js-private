<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Masonry Svelte component — Pinterest-style staggered
   * grid layout. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MasonryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Masonry. */
  export type MasonryProps = v.InferOutput<typeof MasonryPropsSchema>;
</script>

<script lang="ts">
  /**
   * Masonry — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Masonry />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MasonryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MasonryProps = $derived.by(() => {
    const rawProps: MasonryProps = stripSvelteProps(allProps);
    const result = safeParse(MasonryPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MasonryProps;
  });
</script>

<div data-slot="masonry" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
