<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * HeroCarousel Svelte component — hero section with rotating
   * slides for marketing landing pages. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HeroCarouselPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for HeroCarousel. */
  export type HeroCarouselProps = v.InferOutput<typeof HeroCarouselPropsSchema>;
</script>

<script lang="ts">
  /**
   * HeroCarousel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HeroCarousel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HeroCarouselProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HeroCarouselProps = $derived.by(() => {
    const rawProps: HeroCarouselProps = stripSvelteProps(allProps);
    const result = safeParse(HeroCarouselPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeroCarouselProps;
  });
</script>

<div data-slot="hero-carousel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
