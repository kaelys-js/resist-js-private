<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AvailabilityPicker — selects available time slots from a
   * schedule. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AvailabilityPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AvailabilityPicker. */
  export type AvailabilityPickerProps = v.InferOutput<typeof AvailabilityPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * AvailabilityPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AvailabilityPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AvailabilityPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AvailabilityPickerProps = $derived.by(() => {
    const rawProps: AvailabilityPickerProps = stripSvelteProps(allProps);
    const result = safeParse(AvailabilityPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AvailabilityPickerProps;
  });
</script>

<div data-slot="availability-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
