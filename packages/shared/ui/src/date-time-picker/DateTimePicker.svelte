<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DateTimePicker — combined date + time picker. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DateTimePickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DateTimePicker. */
  export type DateTimePickerProps = v.InferOutput<typeof DateTimePickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * DateTimePicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DateTimePicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DateTimePickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DateTimePickerProps = $derived.by(() => {
    const rawProps: DateTimePickerProps = stripSvelteProps(allProps);
    const result = safeParse(DateTimePickerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DateTimePickerProps;
  });
</script>

<div data-slot="date-time-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
