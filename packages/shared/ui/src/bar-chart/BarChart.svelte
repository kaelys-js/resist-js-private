<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BarChart — vertical or horizontal bar chart for categorical
   * data. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BarChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BarChart. */
  export type BarChartProps = v.InferOutput<typeof BarChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * BarChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BarChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BarChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BarChartProps = $derived.by(() => {
    const rawProps: BarChartProps = stripSvelteProps(allProps);
    const result = safeParse(BarChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BarChartProps;
  });
</script>

<div data-slot="bar-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
