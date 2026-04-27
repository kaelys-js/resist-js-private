<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const HeroHighlightPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for HeroHighlight. */
  export type HeroHighlightProps = v.InferOutput<typeof HeroHighlightPropsSchema>;
</script>

<script lang="ts">
  /**
   * HeroHighlight — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <HeroHighlight />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = HeroHighlightProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: HeroHighlightProps = $derived.by(() => {
    const rawProps: HeroHighlightProps = stripSvelteProps(allProps);
    const result = safeParse(HeroHighlightPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as HeroHighlightProps;
  });
</script>

<div data-slot="hero-highlight" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
