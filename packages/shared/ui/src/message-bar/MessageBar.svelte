<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MessageBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MessageBarProps = v.InferOutput<typeof MessageBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * MessageBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MessageBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MessageBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MessageBarProps = $derived.by(() => {
    const rawProps: MessageBarProps = stripSvelteProps(allProps);
    const result = safeParse(MessageBarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MessageBarProps;
  });
</script>

<div data-slot="message-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
