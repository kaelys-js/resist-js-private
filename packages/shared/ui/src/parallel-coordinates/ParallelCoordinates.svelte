<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ParallelCoordinates Svelte component — parallel-
   * coordinates multivariate data chart. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ParallelCoordinatesPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ParallelCoordinates. */
  export type ParallelCoordinatesProps = v.InferOutput<typeof ParallelCoordinatesPropsSchema>;
</script>

<script lang="ts">
  /**
   * ParallelCoordinates — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ParallelCoordinates />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ParallelCoordinatesProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ParallelCoordinatesProps = $derived.by(() => {
    const rawProps: ParallelCoordinatesProps = stripSvelteProps(allProps);
    const result = safeParse(ParallelCoordinatesPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ParallelCoordinatesProps;
  });
</script>

<div data-slot="parallel-coordinates" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
