<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AreaChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AreaChartProps = v.InferOutput<typeof AreaChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * AreaChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AreaChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AreaChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AreaChartProps = $derived.by(() => {
    const rawProps: AreaChartProps = stripSvelteProps(allProps);
    const result = safeParse(AreaChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AreaChartProps;
  });
</script>

<div data-slot="area-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
