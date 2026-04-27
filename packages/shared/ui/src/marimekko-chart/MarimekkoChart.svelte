<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MarimekkoChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MarimekkoChart. */
  export type MarimekkoChartProps = v.InferOutput<typeof MarimekkoChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * MarimekkoChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MarimekkoChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MarimekkoChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MarimekkoChartProps = $derived.by(() => {
    const rawProps: MarimekkoChartProps = stripSvelteProps(allProps);
    const result = safeParse(MarimekkoChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MarimekkoChartProps;
  });
</script>

<div data-slot="marimekko-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
