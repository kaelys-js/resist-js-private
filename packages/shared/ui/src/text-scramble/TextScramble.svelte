<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TextScramblePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TextScrambleProps = v.InferOutput<typeof TextScramblePropsSchema>;
</script>

<script lang="ts">
  /**
   * TextScramble — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TextScramble />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TextScrambleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TextScrambleProps = $derived.by(() => {
    const rawProps: TextScrambleProps = stripSvelteProps(allProps);
    const result = safeParse(TextScramblePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TextScrambleProps;
  });
</script>

<div data-slot="text-scramble" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
