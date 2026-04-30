<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * WaterfallChart Svelte component — incremental cumulative
   * change chart (positive / negative bars). Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WaterfallChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for WaterfallChart. */
  export type WaterfallChartProps = v.InferOutput<typeof WaterfallChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * WaterfallChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WaterfallChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WaterfallChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WaterfallChartProps = $derived.by(() => {
    const rawProps: WaterfallChartProps = stripSvelteProps(allProps);
    const result = safeParse(WaterfallChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WaterfallChartProps;
  });
</script>

<div data-slot="waterfall-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
