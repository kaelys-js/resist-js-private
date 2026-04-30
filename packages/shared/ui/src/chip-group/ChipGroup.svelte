<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ChipGroup — grouped selectable chips for multi-select tag
   * UIs. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChipGroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ChipGroup. */
  export type ChipGroupProps = v.InferOutput<typeof ChipGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * ChipGroup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChipGroup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChipGroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChipGroupProps = $derived.by(() => {
    const rawProps: ChipGroupProps = stripSvelteProps(allProps);
    const result = safeParse(ChipGroupPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChipGroupProps;
  });
</script>

<div data-slot="chip-group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
