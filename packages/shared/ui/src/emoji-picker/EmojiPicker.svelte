<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EmojiPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EmojiPicker. */
  export type EmojiPickerProps = v.InferOutput<typeof EmojiPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * EmojiPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EmojiPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EmojiPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EmojiPickerProps = $derived.by(() => {
    const rawProps: EmojiPickerProps = stripSvelteProps(allProps);
    const result = safeParse(EmojiPickerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EmojiPickerProps;
  });
</script>

<div data-slot="emoji-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
