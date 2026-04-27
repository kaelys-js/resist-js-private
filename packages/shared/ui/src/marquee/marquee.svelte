<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MarqueePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Marquee. */
  export type MarqueeProps = v.InferOutput<typeof MarqueePropsSchema>;
</script>

<script lang="ts">
  /**
   * Marquee — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Marquee />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MarqueeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MarqueeProps = $derived.by(() => {
    const rawProps: MarqueeProps = stripSvelteProps(allProps);
    const result = safeParse(MarqueePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MarqueeProps;
  });
</script>

<div data-slot="marquee" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
