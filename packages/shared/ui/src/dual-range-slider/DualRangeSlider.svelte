<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DualRangeSliderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DualRangeSlider. */
  export type DualRangeSliderProps = v.InferOutput<typeof DualRangeSliderPropsSchema>;
</script>

<script lang="ts">
  /**
   * DualRangeSlider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DualRangeSlider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DualRangeSliderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DualRangeSliderProps = $derived.by(() => {
    const rawProps: DualRangeSliderProps = stripSvelteProps(allProps);
    const result = safeParse(DualRangeSliderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DualRangeSliderProps;
  });
</script>

<div data-slot="dual-range-slider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
