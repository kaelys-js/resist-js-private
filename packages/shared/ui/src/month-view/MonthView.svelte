<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MonthView Svelte component — calendar month grid view.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MonthViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MonthView. */
  export type MonthViewProps = v.InferOutput<typeof MonthViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * MonthView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MonthView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MonthViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MonthViewProps = $derived.by(() => {
    const rawProps: MonthViewProps = stripSvelteProps(allProps);
    const result = safeParse(MonthViewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MonthViewProps;
  });
</script>

<div data-slot="month-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
