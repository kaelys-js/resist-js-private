<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChatBubblePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ChatBubbleProps = v.InferOutput<typeof ChatBubblePropsSchema>;
</script>

<script lang="ts">
  /**
   * ChatBubble — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChatBubble />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChatBubbleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChatBubbleProps = $derived.by(() => {
    const rawProps: ChatBubbleProps = stripSvelteProps(allProps);
    const result = safeParse(ChatBubblePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChatBubbleProps;
  });
</script>

<div data-slot="chat-bubble" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
