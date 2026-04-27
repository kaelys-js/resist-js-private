<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DateRangeField — segmented start / end date range input.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DateRangeFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DateRangeField. */
  export type DateRangeFieldProps = v.InferOutput<typeof DateRangeFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * DateRangeField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DateRangeField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DateRangeFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DateRangeFieldProps = $derived.by(() => {
    const rawProps: DateRangeFieldProps = stripSvelteProps(allProps);
    const result = safeParse(DateRangeFieldPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DateRangeFieldProps;
  });
</script>

<div data-slot="date-range-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
