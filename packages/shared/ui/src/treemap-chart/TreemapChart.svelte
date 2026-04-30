<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TreemapChart Svelte component — nested-rectangle chart
   * showing hierarchical proportions. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TreemapChartPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TreemapChart. */
  export type TreemapChartProps = v.InferOutput<typeof TreemapChartPropsSchema>;
</script>

<script lang="ts">
  /**
   * TreemapChart — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TreemapChart />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TreemapChartProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TreemapChartProps = $derived.by(() => {
    const rawProps: TreemapChartProps = stripSvelteProps(allProps);
    const result = safeParse(TreemapChartPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TreemapChartProps;
  });
</script>

<div data-slot="treemap-chart" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
