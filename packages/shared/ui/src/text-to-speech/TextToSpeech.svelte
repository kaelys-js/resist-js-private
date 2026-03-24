<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TextToSpeechPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TextToSpeechProps = v.InferOutput<typeof TextToSpeechPropsSchema>;
</script>

<script lang="ts">
  /**
   * TextToSpeech — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TextToSpeech />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TextToSpeechProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TextToSpeechProps = $derived.by(() => {
    const rawProps: TextToSpeechProps = stripSvelteProps(allProps);
    const result = safeParse(TextToSpeechPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TextToSpeechProps;
  });
</script>

<div data-slot="text-to-speech" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
