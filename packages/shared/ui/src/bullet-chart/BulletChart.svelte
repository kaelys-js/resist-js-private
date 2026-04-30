<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BulletChart — compact bullet chart for performance / target
   * comparisons. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BulletChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BulletChart. */
  export type BulletChartProps = v.InferOutput<typeof BulletChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * BulletChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BulletChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BulletChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BulletChartProps = $derived.by(() => {
    const rawProps: BulletChartProps = stripSvelteProps(allProps);
    const result = safeParse(BulletChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BulletChartProps;
  });
</script>

<div data-slot="bullet-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
