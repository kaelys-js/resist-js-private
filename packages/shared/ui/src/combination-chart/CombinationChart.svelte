<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CombinationChart — chart that mixes bar + line series on the
   * same axis. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CombinationChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CombinationChart. */
  export type CombinationChartProps = v.InferOutput<typeof CombinationChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * CombinationChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CombinationChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CombinationChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CombinationChartProps = $derived.by(() => {
    const rawProps: CombinationChartProps = stripSvelteProps(allProps);
    const result = safeParse(CombinationChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CombinationChartProps;
  });
</script>

<div data-slot="combination-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
