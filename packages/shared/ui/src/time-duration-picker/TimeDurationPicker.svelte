<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimeDurationPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TimeDurationPickerProps = v.InferOutput<typeof TimeDurationPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * TimeDurationPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TimeDurationPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimeDurationPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimeDurationPickerProps = $derived.by(() => {
    const rawProps: TimeDurationPickerProps = stripSvelteProps(allProps);
    const result = safeParse(TimeDurationPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimeDurationPickerProps;
  });
</script>

<div data-slot="time-duration-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
