<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SvgMaskEffect Svelte component — animated SVG-mask reveal
   * effect for clipping content into shapes. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SvgMaskEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SvgMaskEffect. */
  export type SvgMaskEffectProps = v.InferOutput<typeof SvgMaskEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * SvgMaskEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SvgMaskEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SvgMaskEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SvgMaskEffectProps = $derived.by(() => {
    const rawProps: SvgMaskEffectProps = stripSvelteProps(allProps);
    const result = safeParse(SvgMaskEffectPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SvgMaskEffectProps;
  });
</script>

<div data-slot="svg-mask-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
