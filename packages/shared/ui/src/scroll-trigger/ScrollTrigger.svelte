<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScrollTriggerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ScrollTriggerProps = v.InferOutput<typeof ScrollTriggerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScrollTrigger — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScrollTrigger />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScrollTriggerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScrollTriggerProps = $derived.by(() => {
    const rawProps: ScrollTriggerProps = stripSvelteProps(allProps);
    const result = safeParse(ScrollTriggerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScrollTriggerProps;
  });
</script>

<div data-slot="scroll-trigger" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
