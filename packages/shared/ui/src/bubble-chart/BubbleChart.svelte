<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BubbleChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BubbleChart. */
  export type BubbleChartProps = v.InferOutput<typeof BubbleChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * BubbleChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BubbleChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BubbleChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BubbleChartProps = $derived.by(() => {
    const rawProps: BubbleChartProps = stripSvelteProps(allProps);
    const result = safeParse(BubbleChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BubbleChartProps;
  });
</script>

<div data-slot="bubble-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
