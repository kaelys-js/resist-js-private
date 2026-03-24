<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConversationListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ConversationListProps = v.InferOutput<typeof ConversationListPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConversationList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConversationList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConversationListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConversationListProps = $derived.by(() => {
    const rawProps: ConversationListProps = stripSvelteProps(allProps);
    const result = safeParse(ConversationListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConversationListProps;
  });
</script>

<div data-slot="conversation-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
