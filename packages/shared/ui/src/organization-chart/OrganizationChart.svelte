<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * OrganizationChart Svelte component — hierarchical org
   * chart with reporting lines. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OrganizationChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for OrganizationChart. */
  export type OrganizationChartProps = v.InferOutput<typeof OrganizationChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * OrganizationChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OrganizationChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OrganizationChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OrganizationChartProps = $derived.by(() => {
    const rawProps: OrganizationChartProps = stripSvelteProps(allProps);
    const result = safeParse(OrganizationChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OrganizationChartProps;
  });
</script>

<div data-slot="organization-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
