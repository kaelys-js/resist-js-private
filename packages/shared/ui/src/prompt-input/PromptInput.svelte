<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PromptInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PromptInputProps = v.InferOutput<typeof PromptInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * PromptInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PromptInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PromptInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PromptInputProps = $derived.by(() => {
    const rawProps: PromptInputProps = stripSvelteProps(allProps);
    const result = safeParse(PromptInputPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PromptInputProps;
  });
</script>

<div data-slot="prompt-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
