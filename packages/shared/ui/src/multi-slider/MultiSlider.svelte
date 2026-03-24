<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MultiSliderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MultiSliderProps = v.InferOutput<typeof MultiSliderPropsSchema>;
</script>

<script lang="ts">
  /**
   * MultiSlider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MultiSlider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MultiSliderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MultiSliderProps = $derived.by(() => {
    const rawProps: MultiSliderProps = stripSvelteProps(allProps);
    const result = safeParse(MultiSliderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MultiSliderProps;
  });
</script>

<div data-slot="multi-slider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
