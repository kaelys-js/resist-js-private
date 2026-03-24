<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorVariantSelectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ColorVariantSelectorProps = v.InferOutput<typeof ColorVariantSelectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorVariantSelector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorVariantSelector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorVariantSelectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorVariantSelectorProps = $derived.by(() => {
    const rawProps: ColorVariantSelectorProps = stripSvelteProps(allProps);
    const result = safeParse(ColorVariantSelectorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorVariantSelectorProps;
  });
</script>

<div data-slot="color-variant-selector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
