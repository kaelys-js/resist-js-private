<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BarList — ranked horizontal-bar list for comparison views.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BarListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BarList. */
  export type BarListProps = v.InferOutput<typeof BarListPropsSchema>;
</script>

<script lang="ts">
  /**
   * BarList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BarList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BarListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BarListProps = $derived.by(() => {
    const rawProps: BarListProps = stripSvelteProps(allProps);
    const result = safeParse(BarListPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BarListProps;
  });
</script>

<div data-slot="bar-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
