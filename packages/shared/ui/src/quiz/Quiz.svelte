<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const QuizPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type QuizProps = v.InferOutput<typeof QuizPropsSchema>;
</script>

<script lang="ts">
  /**
   * Quiz — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Quiz />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = QuizProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: QuizProps = $derived.by(() => {
    const rawProps: QuizProps = stripSvelteProps(allProps);
    const result = safeParse(QuizPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as QuizProps;
  });
</script>

<div data-slot="quiz" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
