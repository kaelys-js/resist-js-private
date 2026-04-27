<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BudgetTracker — budget-vs-actual tracker visualization.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BudgetTrackerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BudgetTracker. */
  export type BudgetTrackerProps = v.InferOutput<typeof BudgetTrackerPropsSchema>;
</script>

<script lang="ts">
  /**
   * BudgetTracker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BudgetTracker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BudgetTrackerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BudgetTrackerProps = $derived.by(() => {
    const rawProps: BudgetTrackerProps = stripSvelteProps(allProps);
    const result = safeParse(BudgetTrackerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BudgetTrackerProps;
  });
</script>

<div data-slot="budget-tracker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
