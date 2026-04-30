<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RetentionChart Svelte component — cohort retention table
   * showing how user cohorts persist across periods.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RetentionChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RetentionChart. */
  export type RetentionChartProps = v.InferOutput<typeof RetentionChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * RetentionChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RetentionChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RetentionChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RetentionChartProps = $derived.by(() => {
    const rawProps: RetentionChartProps = stripSvelteProps(allProps);
    const result = safeParse(RetentionChartPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RetentionChartProps;
  });
</script>

<div data-slot="retention-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
