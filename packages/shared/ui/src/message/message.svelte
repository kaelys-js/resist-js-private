<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MessagePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type MessageProps = v.InferOutput<typeof MessagePropsSchema>;
</script>

<script lang="ts">
  /**
   * Message — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Message />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MessageProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MessageProps = $derived.by(() => {
    const rawProps: MessageProps = stripSvelteProps(allProps);
    const result = safeParse(MessagePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MessageProps;
  });
</script>

<div data-slot="message" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
