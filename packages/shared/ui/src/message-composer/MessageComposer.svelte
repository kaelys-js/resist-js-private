<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MessageComposer Svelte component — multi-line input bar
   * with attachment / emoji controls. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MessageComposerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MessageComposer. */
  export type MessageComposerProps = v.InferOutput<typeof MessageComposerPropsSchema>;
</script>

<script lang="ts">
  /**
   * MessageComposer — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MessageComposer />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MessageComposerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MessageComposerProps = $derived.by(() => {
    const rawProps: MessageComposerProps = stripSvelteProps(allProps);
    const result = safeParse(MessageComposerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MessageComposerProps;
  });
</script>

<div data-slot="message-composer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
