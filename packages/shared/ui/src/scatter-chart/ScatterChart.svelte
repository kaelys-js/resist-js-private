<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScatterChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ScatterChart. */
  export type ScatterChartProps = v.InferOutput<typeof ScatterChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScatterChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScatterChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScatterChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScatterChartProps = $derived.by(() => {
    const rawProps: ScatterChartProps = stripSvelteProps(allProps);
    const result = safeParse(ScatterChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScatterChartProps;
  });
</script>

<div data-slot="scatter-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
