<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DistanceCalculator — calculator for distance between two
   * geo-points. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DistanceCalculatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DistanceCalculator. */
  export type DistanceCalculatorProps = v.InferOutput<typeof DistanceCalculatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * DistanceCalculator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DistanceCalculator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DistanceCalculatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DistanceCalculatorProps = $derived.by(() => {
    const rawProps: DistanceCalculatorProps = stripSvelteProps(allProps);
    const result = safeParse(DistanceCalculatorPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DistanceCalculatorProps;
  });
</script>

<div data-slot="distance-calculator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
