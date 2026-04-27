<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MultiViewCalendarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MultiViewCalendar. */
  export type MultiViewCalendarProps = v.InferOutput<typeof MultiViewCalendarPropsSchema>;
</script>

<script lang="ts">
  /**
   * MultiViewCalendar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MultiViewCalendar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MultiViewCalendarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MultiViewCalendarProps = $derived.by(() => {
    const rawProps: MultiViewCalendarProps = stripSvelteProps(allProps);
    const result = safeParse(MultiViewCalendarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MultiViewCalendarProps;
  });
</script>

<div data-slot="multi-view-calendar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
