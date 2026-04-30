<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ParallaxScroll Svelte component — multi-layer parallax
   * scroll effect. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ParallaxScrollPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ParallaxScroll. */
  export type ParallaxScrollProps = v.InferOutput<typeof ParallaxScrollPropsSchema>;
</script>

<script lang="ts">
  /**
   * ParallaxScroll — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ParallaxScroll />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ParallaxScrollProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ParallaxScrollProps = $derived.by(() => {
    const rawProps: ParallaxScrollProps = stripSvelteProps(allProps);
    const result = safeParse(ParallaxScrollPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ParallaxScrollProps;
  });
</script>

<div data-slot="parallax-scroll" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
