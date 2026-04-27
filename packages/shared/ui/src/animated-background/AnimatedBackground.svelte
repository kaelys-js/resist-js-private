<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedBackgroundPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnimatedBackground. */
  export type AnimatedBackgroundProps = v.InferOutput<typeof AnimatedBackgroundPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedBackground — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedBackground />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedBackgroundProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedBackgroundProps = $derived.by(() => {
    const rawProps: AnimatedBackgroundProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedBackgroundPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedBackgroundProps;
  });
</script>

<div data-slot="animated-background" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
