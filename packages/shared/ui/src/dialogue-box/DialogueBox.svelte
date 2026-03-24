<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DialogueBoxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DialogueBoxProps = v.InferOutput<typeof DialogueBoxPropsSchema>;
</script>

<script lang="ts">
  /**
   * DialogueBox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DialogueBox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DialogueBoxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DialogueBoxProps = $derived.by(() => {
    const rawProps: DialogueBoxProps = stripSvelteProps(allProps);
    const result = safeParse(DialogueBoxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DialogueBoxProps;
  });
</script>

<div data-slot="dialogue-box" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
