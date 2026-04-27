<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AnalyticsCard — single-metric card with trend indicator.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnalyticsCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnalyticsCard. */
  export type AnalyticsCardProps = v.InferOutput<typeof AnalyticsCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnalyticsCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnalyticsCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnalyticsCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnalyticsCardProps = $derived.by(() => {
    const rawProps: AnalyticsCardProps = stripSvelteProps(allProps);
    const result = safeParse(AnalyticsCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnalyticsCardProps;
  });
</script>

<div data-slot="analytics-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
