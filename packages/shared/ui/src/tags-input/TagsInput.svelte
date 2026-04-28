<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TagsInput Svelte component — text input that converts
   * typed text into tag chips on Enter / delimiter, with
   * removal via backspace or click. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TagsInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TagsInput. */
  export type TagsInputProps = v.InferOutput<typeof TagsInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * TagsInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TagsInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TagsInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TagsInputProps = $derived.by(() => {
    const rawProps: TagsInputProps = stripSvelteProps(allProps);
    const result = safeParse(TagsInputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TagsInputProps;
  });
</script>

<div data-slot="tags-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
