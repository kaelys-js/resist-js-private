<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorGradientPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ColorGradientPicker. */
  export type ColorGradientPickerProps = v.InferOutput<typeof ColorGradientPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorGradientPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorGradientPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorGradientPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorGradientPickerProps = $derived.by(() => {
    const rawProps: ColorGradientPickerProps = stripSvelteProps(allProps);
    const result = safeParse(ColorGradientPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorGradientPickerProps;
  });
</script>

<div data-slot="color-gradient-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
