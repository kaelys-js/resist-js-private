<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AnimatedCard — card with hover effects, 3D transforms,
   * spotlight, or animated borders. Placeholder shell awaiting
   * full implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnimatedCard. */
  export type AnimatedCardProps = v.InferOutput<typeof AnimatedCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedCardProps = $derived.by(() => {
    const rawProps: AnimatedCardProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedCardPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedCardProps;
  });
</script>

<div data-slot="animated-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
