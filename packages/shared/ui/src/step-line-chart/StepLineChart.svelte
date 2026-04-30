<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * StepLineChart Svelte component — staircase-style line
   * chart suited for stepwise time series. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StepLineChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StepLineChart. */
  export type StepLineChartProps = v.InferOutput<typeof StepLineChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * StepLineChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StepLineChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StepLineChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StepLineChartProps = $derived.by(() => {
    const rawProps: StepLineChartProps = stripSvelteProps(allProps);
    const result = safeParse(StepLineChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StepLineChartProps;
  });
</script>

<div data-slot="step-line-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
