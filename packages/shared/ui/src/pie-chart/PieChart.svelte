<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PieChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PieChartProps = v.InferOutput<typeof PieChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * PieChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PieChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PieChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PieChartProps = $derived.by(() => {
    const rawProps: PieChartProps = stripSvelteProps(allProps);
    const result = safeParse(PieChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PieChartProps;
  });
</script>

<div data-slot="pie-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
