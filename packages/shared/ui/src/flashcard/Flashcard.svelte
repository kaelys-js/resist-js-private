<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Flashcard Svelte component — flippable study flashcard
   * with question / answer faces. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FlashcardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Flashcard. */
  export type FlashcardProps = v.InferOutput<typeof FlashcardPropsSchema>;
</script>

<script lang="ts">
  /**
   * Flashcard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Flashcard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FlashcardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FlashcardProps = $derived.by(() => {
    const rawProps: FlashcardProps = stripSvelteProps(allProps);
    const result = safeParse(FlashcardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FlashcardProps;
  });
</script>

<div data-slot="flashcard" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
