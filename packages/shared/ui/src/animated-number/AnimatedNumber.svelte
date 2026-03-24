<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnimatedNumberPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AnimatedNumberProps = v.InferOutput<typeof AnimatedNumberPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnimatedNumber — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnimatedNumber />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnimatedNumberProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnimatedNumberProps = $derived.by(() => {
    const rawProps: AnimatedNumberProps = stripSvelteProps(allProps);
    const result = safeParse(AnimatedNumberPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnimatedNumberProps;
  });
</script>

<div data-slot="animated-number" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
