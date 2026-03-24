<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedGradientTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AnimatedGradientTextProps = v.InferOutput<typeof AnimatedGradientTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedGradientText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedGradientText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedGradientTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedGradientTextProps = $derived.by(() => {
    const rawProps: AnimatedGradientTextProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedGradientTextPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedGradientTextProps;
  });
</script>

<div data-slot="animated-gradient-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
