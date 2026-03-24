<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MessageReactionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MessageReactionProps = v.InferOutput<typeof MessageReactionPropsSchema>;
</script>

<script lang="ts">
  /**
   * MessageReaction — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MessageReaction />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MessageReactionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MessageReactionProps = $derived.by(() => {
    const rawProps: MessageReactionProps = stripSvelteProps(allProps);
    const result = safeParse(MessageReactionPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MessageReactionProps;
  });
</script>

<div data-slot="message-reaction" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
