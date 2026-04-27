<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BottomSheet — panel that slides up from the bottom of the
   * screen for contextual content. Placeholder shell awaiting
   * full implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BottomSheetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BottomSheet. */
  export type BottomSheetProps = v.InferOutput<typeof BottomSheetPropsSchema>;
</script>

<script lang="ts">
  /**
   * BottomSheet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BottomSheet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BottomSheetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BottomSheetProps = $derived.by(() => {
    const rawProps: BottomSheetProps = stripSvelteProps(allProps);
    const result = safeParse(BottomSheetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BottomSheetProps;
  });
</script>

<div data-slot="bottom-sheet" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
