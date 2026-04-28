<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PivotGrid Svelte component — pivot-table data grid.
   * Placeholder shell awaiting full implementation; ships with
   * a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PivotGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PivotGrid. */
  export type PivotGridProps = v.InferOutput<typeof PivotGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * PivotGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PivotGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PivotGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PivotGridProps = $derived.by(() => {
    const rawProps: PivotGridProps = stripSvelteProps(allProps);
    const result = safeParse(PivotGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PivotGridProps;
  });
</script>

<div data-slot="pivot-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
