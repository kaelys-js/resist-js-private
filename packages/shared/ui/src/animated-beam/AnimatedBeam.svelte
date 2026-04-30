<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AnimatedBeam — animated SVG-path beam connecting two anchor
   * elements. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedBeamPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnimatedBeam. */
  export type AnimatedBeamProps = v.InferOutput<typeof AnimatedBeamPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedBeam — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedBeam />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedBeamProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedBeamProps = $derived.by(() => {
    const rawProps: AnimatedBeamProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedBeamPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedBeamProps;
  });
</script>

<div data-slot="animated-beam" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
