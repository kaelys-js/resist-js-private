<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AiChatPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AiChatProps = v.InferOutput<typeof AiChatPropsSchema>;
</script>

<script lang="ts">
  /**
   * AiChat — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AiChat />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AiChatProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AiChatProps = $derived.by(() => {
    const rawProps: AiChatProps = stripSvelteProps(allProps);
    const result = safeParse(AiChatPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AiChatProps;
  });
</script>

<div data-slot="ai-chat" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
