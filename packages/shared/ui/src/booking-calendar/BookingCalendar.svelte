<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BookingCalendar — calendar-style date / slot picker for
   * bookings. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BookingCalendarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BookingCalendar. */
  export type BookingCalendarProps = v.InferOutput<typeof BookingCalendarPropsSchema>;
</script>

<script lang="ts">
  /**
   * BookingCalendar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BookingCalendar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BookingCalendarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BookingCalendarProps = $derived.by(() => {
    const rawProps: BookingCalendarProps = stripSvelteProps(allProps);
    const result = safeParse(BookingCalendarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BookingCalendarProps;
  });
</script>

<div data-slot="booking-calendar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
