<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TimePicker Svelte component — clock-style time picker
   * with hour, minute, and optional second / am-pm fields.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimePickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TimePicker. */
  export type TimePickerProps = v.InferOutput<typeof TimePickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * TimePicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TimePicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimePickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimePickerProps = $derived.by(() => {
    const rawProps: TimePickerProps = stripSvelteProps(allProps);
    const result = safeParse(TimePickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimePickerProps;
  });
</script>

<div data-slot="time-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
