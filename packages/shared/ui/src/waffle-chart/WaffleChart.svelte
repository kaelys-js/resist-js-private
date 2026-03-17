<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WaffleChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type WaffleChartProps = v.InferOutput<typeof WaffleChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * WaffleChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WaffleChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WaffleChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WaffleChartProps = $derived.by(() => {
    const rawProps: WaffleChartProps = stripSvelteProps(allProps);
    const result = safeParse(WaffleChartPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WaffleChartProps;
  });
</script>

<div data-slot="waffle-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
