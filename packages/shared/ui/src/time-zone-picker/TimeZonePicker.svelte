<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TimeZonePicker Svelte component — searchable IANA
   * time-zone selector. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimeZonePickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TimeZonePicker. */
  export type TimeZonePickerProps = v.InferOutput<typeof TimeZonePickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * TimeZonePicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TimeZonePicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimeZonePickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimeZonePickerProps = $derived.by(() => {
    const rawProps: TimeZonePickerProps = stripSvelteProps(allProps);
    const result = safeParse(TimeZonePickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimeZonePickerProps;
  });
</script>

<div data-slot="time-zone-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
