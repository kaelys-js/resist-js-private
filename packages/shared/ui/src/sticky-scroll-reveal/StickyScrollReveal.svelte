<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * StickyScrollReveal Svelte component — scroll-driven
   * layout where pinned content reveals or swaps as the
   * reader progresses through sections. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StickyScrollRevealPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StickyScrollReveal. */
  export type StickyScrollRevealProps = v.InferOutput<typeof StickyScrollRevealPropsSchema>;
</script>

<script lang="ts">
  /**
   * StickyScrollReveal — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StickyScrollReveal />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StickyScrollRevealProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StickyScrollRevealProps = $derived.by(() => {
    const rawProps: StickyScrollRevealProps = stripSvelteProps(allProps);
    const result = safeParse(StickyScrollRevealPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StickyScrollRevealProps;
  });
</script>

<div data-slot="sticky-scroll-reveal" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
