<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PortfolioChart Svelte component — portfolio performance
   * chart. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PortfolioChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PortfolioChart. */
  export type PortfolioChartProps = v.InferOutput<typeof PortfolioChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * PortfolioChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PortfolioChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PortfolioChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PortfolioChartProps = $derived.by(() => {
    const rawProps: PortfolioChartProps = stripSvelteProps(allProps);
    const result = safeParse(PortfolioChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PortfolioChartProps;
  });
</script>

<div data-slot="portfolio-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
