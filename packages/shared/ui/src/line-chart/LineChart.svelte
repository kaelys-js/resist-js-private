<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LineChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LineChart. */
  export type LineChartProps = v.InferOutput<typeof LineChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * LineChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LineChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LineChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LineChartProps = $derived.by(() => {
    const rawProps: LineChartProps = stripSvelteProps(allProps);
    const result = safeParse(LineChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LineChartProps;
  });
</script>

<div data-slot="line-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
