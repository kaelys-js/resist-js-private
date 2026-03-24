<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HeroParallaxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type HeroParallaxProps = v.InferOutput<typeof HeroParallaxPropsSchema>;
</script>

<script lang="ts">
  /**
   * HeroParallax — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HeroParallax />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HeroParallaxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HeroParallaxProps = $derived.by(() => {
    const rawProps: HeroParallaxProps = stripSvelteProps(allProps);
    const result = safeParse(HeroParallaxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeroParallaxProps;
  });
</script>

<div data-slot="hero-parallax" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
