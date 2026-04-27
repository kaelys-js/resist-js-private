<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CohortTable — cohort retention / analytics table. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CohortTablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CohortTable. */
  export type CohortTableProps = v.InferOutput<typeof CohortTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * CohortTable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CohortTable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CohortTableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CohortTableProps = $derived.by(() => {
    const rawProps: CohortTableProps = stripSvelteProps(allProps);
    const result = safeParse(CohortTablePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CohortTableProps;
  });
</script>

<div data-slot="cohort-table" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
