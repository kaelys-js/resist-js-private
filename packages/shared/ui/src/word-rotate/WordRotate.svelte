<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WordRotatePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for WordRotate. */
  export type WordRotateProps = v.InferOutput<typeof WordRotatePropsSchema>;
</script>

<script lang="ts">
  /**
   * WordRotate — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <WordRotate />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WordRotateProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WordRotateProps = $derived.by(() => {
    const rawProps: WordRotateProps = stripSvelteProps(allProps);
    const result = safeParse(WordRotatePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WordRotateProps;
  });
</script>

<div data-slot="word-rotate" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
