<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VoiceMessagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type VoiceMessageProps = v.InferOutput<typeof VoiceMessagePropsSchema>;
</script>

<script lang="ts">
  /**
   * VoiceMessage — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VoiceMessage />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VoiceMessageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VoiceMessageProps = $derived.by(() => {
    const rawProps: VoiceMessageProps = stripSvelteProps(allProps);
    const result = safeParse(VoiceMessagePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VoiceMessageProps;
  });
</script>

<div data-slot="voice-message" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
