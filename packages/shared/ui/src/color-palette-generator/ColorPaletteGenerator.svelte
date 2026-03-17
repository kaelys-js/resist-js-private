<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColorPaletteGeneratorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ColorPaletteGeneratorProps = v.InferOutput<typeof ColorPaletteGeneratorPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColorPaletteGenerator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColorPaletteGenerator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColorPaletteGeneratorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColorPaletteGeneratorProps = $derived.by(() => {
    const rawProps: ColorPaletteGeneratorProps = stripSvelteProps(allProps);
    const result = safeParse(ColorPaletteGeneratorPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColorPaletteGeneratorProps;
  });
</script>

<div data-slot="color-palette-generator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
