<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TimeRangeFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TimeRangeFieldProps = v.InferOutput<typeof TimeRangeFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * TimeRangeField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TimeRangeField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TimeRangeFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TimeRangeFieldProps = $derived.by(() => {
    const rawProps: TimeRangeFieldProps = stripSvelteProps(allProps);
    const result = safeParse(TimeRangeFieldPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TimeRangeFieldProps;
  });
</script>

<div data-slot="time-range-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
