<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HeroSectionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for HeroSection. */
  export type HeroSectionProps = v.InferOutput<typeof HeroSectionPropsSchema>;
</script>

<script lang="ts">
  /**
   * HeroSection — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HeroSection />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HeroSectionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HeroSectionProps = $derived.by(() => {
    const rawProps: HeroSectionProps = stripSvelteProps(allProps);
    const result = safeParse(HeroSectionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeroSectionProps;
  });
</script>

<div data-slot="hero-section" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
