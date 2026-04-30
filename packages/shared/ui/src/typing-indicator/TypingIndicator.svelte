<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TypingIndicator Svelte component — animated three-dot
   * "...is typing" indicator for chat surfaces. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TypingIndicatorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TypingIndicator. */
  export type TypingIndicatorProps = v.InferOutput<typeof TypingIndicatorPropsSchema>;
</script>

<script lang="ts">
  /**
   * TypingIndicator — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TypingIndicator />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TypingIndicatorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TypingIndicatorProps = $derived.by(() => {
    const rawProps: TypingIndicatorProps = stripSvelteProps(allProps);
    const result = safeParse(TypingIndicatorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TypingIndicatorProps;
  });
</script>

<div data-slot="typing-indicator" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
