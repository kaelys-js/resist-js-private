<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FlowChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type FlowChartProps = v.InferOutput<typeof FlowChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * FlowChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FlowChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FlowChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FlowChartProps = $derived.by(() => {
    const rawProps: FlowChartProps = stripSvelteProps(allProps);
    const result = safeParse(FlowChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FlowChartProps;
  });
</script>

<div data-slot="flow-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
