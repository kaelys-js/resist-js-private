<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ActionSheet — iOS-style bottom action sheet for mobile UIs.
   * Awaiting full implementation; ships with a placeholder props
   * schema accepting only a root `class` override.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ActionSheetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ActionSheet. */
  export type ActionSheetProps = v.InferOutput<typeof ActionSheetPropsSchema>;
</script>

<script lang="ts">
  /**
   * ActionSheet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ActionSheet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ActionSheetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ActionSheetProps = $derived.by(() => {
    const rawProps: ActionSheetProps = stripSvelteProps(allProps);
    const result = safeParse(ActionSheetPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ActionSheetProps;
  });
</script>

<div data-slot="action-sheet" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
