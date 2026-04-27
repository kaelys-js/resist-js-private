<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RadarChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RadarChart. */
  export type RadarChartProps = v.InferOutput<typeof RadarChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * RadarChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RadarChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RadarChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RadarChartProps = $derived.by(() => {
    const rawProps: RadarChartProps = stripSvelteProps(allProps);
    const result = safeParse(RadarChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RadarChartProps;
  });
</script>

<div data-slot="radar-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
