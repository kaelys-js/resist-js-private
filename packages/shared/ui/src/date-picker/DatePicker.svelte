<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DatePickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DatePickerProps = v.InferOutput<typeof DatePickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * DatePicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DatePicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DatePickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DatePickerProps = $derived.by(() => {
    const rawProps: DatePickerProps = stripSvelteProps(allProps);
    const result = safeParse(DatePickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DatePickerProps;
  });
</script>

<div data-slot="date-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
