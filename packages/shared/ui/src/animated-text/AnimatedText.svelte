<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnimatedText. */
  export type AnimatedTextProps = v.InferOutput<typeof AnimatedTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedTextProps = $derived.by(() => {
    const rawProps: AnimatedTextProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedTextPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedTextProps;
  });
</script>

<div data-slot="animated-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
