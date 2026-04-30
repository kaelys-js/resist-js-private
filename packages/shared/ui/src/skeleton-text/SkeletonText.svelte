<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SkeletonText Svelte component — text-shaped loading
   * placeholder rendering N skeleton lines of varying
   * widths. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SkeletonTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SkeletonText. */
  export type SkeletonTextProps = v.InferOutput<typeof SkeletonTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * SkeletonText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SkeletonText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SkeletonTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SkeletonTextProps = $derived.by(() => {
    const rawProps: SkeletonTextProps = stripSvelteProps(allProps);
    const result = safeParse(SkeletonTextPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SkeletonTextProps;
  });
</script>

<div data-slot="skeleton-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
