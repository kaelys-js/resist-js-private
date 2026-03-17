<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorSliderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ColorSliderProps = v.InferOutput<typeof ColorSliderPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorSlider — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorSlider />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorSliderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorSliderProps = $derived.by(() => {
    const rawProps: ColorSliderProps = stripSvelteProps(allProps);
    const result = safeParse(ColorSliderPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorSliderProps;
  });
</script>

<div data-slot="color-slider" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
