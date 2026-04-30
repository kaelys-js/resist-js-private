<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MessageBubble Svelte component — chat-style speech-
   * bubble for inbound / outbound messages. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MessageBubblePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MessageBubble. */
  export type MessageBubbleProps = v.InferOutput<typeof MessageBubblePropsSchema>;
</script>

<script lang="ts">
  /**
   * MessageBubble — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MessageBubble />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MessageBubbleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MessageBubbleProps = $derived.by(() => {
    const rawProps: MessageBubbleProps = stripSvelteProps(allProps);
    const result = safeParse(MessageBubblePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MessageBubbleProps;
  });
</script>

<div data-slot="message-bubble" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
