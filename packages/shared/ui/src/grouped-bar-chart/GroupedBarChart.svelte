<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * GroupedBarChart Svelte component — side-by-side grouped
   * bar chart for multi-series category comparison. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GroupedBarChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GroupedBarChart. */
  export type GroupedBarChartProps = v.InferOutput<typeof GroupedBarChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * GroupedBarChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GroupedBarChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GroupedBarChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GroupedBarChartProps = $derived.by(() => {
    const rawProps: GroupedBarChartProps = stripSvelteProps(allProps);
    const result = safeParse(GroupedBarChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GroupedBarChartProps;
  });
</script>

<div data-slot="grouped-bar-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
