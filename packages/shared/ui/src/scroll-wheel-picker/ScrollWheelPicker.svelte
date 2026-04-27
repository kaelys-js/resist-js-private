<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScrollWheelPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ScrollWheelPicker. */
  export type ScrollWheelPickerProps = v.InferOutput<typeof ScrollWheelPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScrollWheelPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScrollWheelPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScrollWheelPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScrollWheelPickerProps = $derived.by(() => {
    const rawProps: ScrollWheelPickerProps = stripSvelteProps(allProps);
    const result = safeParse(ScrollWheelPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScrollWheelPickerProps;
  });
</script>

<div data-slot="scroll-wheel-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
