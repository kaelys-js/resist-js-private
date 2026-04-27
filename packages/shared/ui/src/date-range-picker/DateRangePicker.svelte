<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DateRangePicker — popover calendar date-range picker.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DateRangePickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DateRangePicker. */
  export type DateRangePickerProps = v.InferOutput<typeof DateRangePickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * DateRangePicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DateRangePicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DateRangePickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DateRangePickerProps = $derived.by(() => {
    const rawProps: DateRangePickerProps = stripSvelteProps(allProps);
    const result = safeParse(DateRangePickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DateRangePickerProps;
  });
</script>

<div data-slot="date-range-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
