<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Slideshow Svelte component — auto-advancing image carousel
   * with optional pause on hover. Placeholder shell awaiting
   * full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SlideshowPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Slideshow. */
  export type SlideshowProps = v.InferOutput<typeof SlideshowPropsSchema>;
</script>

<script lang="ts">
  /**
   * Slideshow — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Slideshow />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SlideshowProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SlideshowProps = $derived.by(() => {
    const rawProps: SlideshowProps = stripSvelteProps(allProps);
    const result = safeParse(SlideshowPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SlideshowProps;
  });
</script>

<div data-slot="slideshow" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
