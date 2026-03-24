<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SparkChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SparkChartProps = v.InferOutput<typeof SparkChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * SparkChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SparkChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SparkChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SparkChartProps = $derived.by(() => {
    const rawProps: SparkChartProps = stripSvelteProps(allProps);
    const result = safeParse(SparkChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SparkChartProps;
  });
</script>

<div data-slot="spark-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
