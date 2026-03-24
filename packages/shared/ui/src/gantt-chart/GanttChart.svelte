<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GanttChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GanttChartProps = v.InferOutput<typeof GanttChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * GanttChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GanttChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GanttChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GanttChartProps = $derived.by(() => {
    const rawProps: GanttChartProps = stripSvelteProps(allProps);
    const result = safeParse(GanttChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GanttChartProps;
  });
</script>

<div data-slot="gantt-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
