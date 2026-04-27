<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DashboardGrid — draggable / resizable widget grid for
   * dashboards. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DashboardGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DashboardGrid. */
  export type DashboardGridProps = v.InferOutput<typeof DashboardGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * DashboardGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DashboardGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DashboardGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DashboardGridProps = $derived.by(() => {
    const rawProps: DashboardGridProps = stripSvelteProps(allProps);
    const result = safeParse(DashboardGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DashboardGridProps;
  });
</script>

<div data-slot="dashboard-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
