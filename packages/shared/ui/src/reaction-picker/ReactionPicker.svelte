<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ReactionPicker Svelte component — emoji reaction popover
   * for selecting a response to a message or post. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ReactionPickerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ReactionPicker. */
  export type ReactionPickerProps = v.InferOutput<typeof ReactionPickerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ReactionPicker — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ReactionPicker />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ReactionPickerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ReactionPickerProps = $derived.by(() => {
    const rawProps: ReactionPickerProps = stripSvelteProps(allProps);
    const result = safeParse(ReactionPickerPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ReactionPickerProps;
  });
</script>

<div data-slot="reaction-picker" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
