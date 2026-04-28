<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SkeletonGroup Svelte component — preset arrangement of
   * Skeleton elements mimicking specific content shapes
   * (card, list item, article). Placeholder shell awaiting
   * full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SkeletonGroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SkeletonGroup. */
  export type SkeletonGroupProps = v.InferOutput<typeof SkeletonGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * SkeletonGroup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SkeletonGroup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SkeletonGroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SkeletonGroupProps = $derived.by(() => {
    const rawProps: SkeletonGroupProps = stripSvelteProps(allProps);
    const result = safeParse(SkeletonGroupPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SkeletonGroupProps;
  });
</script>

<div data-slot="skeleton-group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
