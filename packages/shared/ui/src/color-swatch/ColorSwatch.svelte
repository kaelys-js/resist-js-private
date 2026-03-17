<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorSwatchPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ColorSwatchProps = v.InferOutput<typeof ColorSwatchPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorSwatch — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorSwatch />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorSwatchProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorSwatchProps = $derived.by(() => {
    const rawProps: ColorSwatchProps = stripSvelteProps(allProps);
    const result = safeParse(ColorSwatchPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorSwatchProps;
  });
</script>

<div data-slot="color-swatch" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
