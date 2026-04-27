<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SwatchPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SwatchPicker. */
  export type SwatchPickerProps = v.InferOutput<typeof SwatchPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * SwatchPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SwatchPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SwatchPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SwatchPickerProps = $derived.by(() => {
    const rawProps: SwatchPickerProps = stripSvelteProps(allProps);
    const result = safeParse(SwatchPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SwatchPickerProps;
  });
</script>

<div data-slot="swatch-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
