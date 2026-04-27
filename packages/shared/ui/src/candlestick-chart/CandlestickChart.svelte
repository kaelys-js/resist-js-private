<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CandlestickChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CandlestickChart. */
  export type CandlestickChartProps = v.InferOutput<typeof CandlestickChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * CandlestickChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CandlestickChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CandlestickChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CandlestickChartProps = $derived.by(() => {
    const rawProps: CandlestickChartProps = stripSvelteProps(allProps);
    const result = safeParse(CandlestickChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CandlestickChartProps;
  });
</script>

<div data-slot="candlestick-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
