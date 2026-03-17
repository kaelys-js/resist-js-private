<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DonutChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DonutChartProps = v.InferOutput<typeof DonutChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * DonutChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DonutChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DonutChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DonutChartProps = $derived.by(() => {
    const rawProps: DonutChartProps = stripSvelteProps(allProps);
    const result = safeParse(DonutChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DonutChartProps;
  });
</script>

<div data-slot="donut-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
