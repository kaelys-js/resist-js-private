<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SplineChart Svelte component — smooth curved line chart
   * (Catmull-Rom / monotone splines) for trend data.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SplineChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SplineChart. */
  export type SplineChartProps = v.InferOutput<typeof SplineChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * SplineChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SplineChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SplineChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SplineChartProps = $derived.by(() => {
    const rawProps: SplineChartProps = stripSvelteProps(allProps);
    const result = safeParse(SplineChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SplineChartProps;
  });
</script>

<div data-slot="spline-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
