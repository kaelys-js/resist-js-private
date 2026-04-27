<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * CanvasRevealEffect — canvas-based dot-reveal hover effect.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CanvasRevealEffectPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for CanvasRevealEffect. */
  export type CanvasRevealEffectProps = v.InferOutput<typeof CanvasRevealEffectPropsSchema>;
</script>

<script lang="ts">
  /**
   * CanvasRevealEffect — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CanvasRevealEffect />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CanvasRevealEffectProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CanvasRevealEffectProps = $derived.by(() => {
    const rawProps: CanvasRevealEffectProps = stripSvelteProps(allProps);
    const result = safeParse(CanvasRevealEffectPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CanvasRevealEffectProps;
  });
</script>

<div data-slot="canvas-reveal-effect" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
