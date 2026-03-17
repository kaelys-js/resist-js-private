<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpeechToTextPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SpeechToTextProps = v.InferOutput<typeof SpeechToTextPropsSchema>;
</script>

<script lang="ts">
  /**
   * SpeechToText — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SpeechToText />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpeechToTextProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpeechToTextProps = $derived.by(() => {
    const rawProps: SpeechToTextProps = stripSvelteProps(allProps);
    const result = safeParse(SpeechToTextPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpeechToTextProps;
  });
</script>

<div data-slot="speech-to-text" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
