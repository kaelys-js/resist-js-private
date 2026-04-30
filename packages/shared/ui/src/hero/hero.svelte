<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Hero Svelte component — large banner section at the top of
   * a page with headline, description, call-to-action buttons,
   * and optional media. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HeroPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Hero. */
  export type HeroProps = v.InferOutput<typeof HeroPropsSchema>;
</script>

<script lang="ts">
  /**
   * Hero — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Hero />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HeroProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HeroProps = $derived.by(() => {
    const rawProps: HeroProps = stripSvelteProps(allProps);
    const result = safeParse(HeroPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeroProps;
  });
</script>

<div data-slot="hero" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
