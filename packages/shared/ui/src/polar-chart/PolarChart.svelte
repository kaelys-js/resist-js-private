<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PolarChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PolarChart. */
  export type PolarChartProps = v.InferOutput<typeof PolarChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * PolarChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PolarChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PolarChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PolarChartProps = $derived.by(() => {
    const rawProps: PolarChartProps = stripSvelteProps(allProps);
    const result = safeParse(PolarChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PolarChartProps;
  });
</script>

<div data-slot="polar-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
