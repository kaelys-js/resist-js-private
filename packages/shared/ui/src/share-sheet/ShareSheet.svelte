<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ShareSheet Svelte component — bottom-sheet share menu
   * presenting native and app-specific share targets.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ShareSheetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ShareSheet. */
  export type ShareSheetProps = v.InferOutput<typeof ShareSheetPropsSchema>;
</script>

<script lang="ts">
  /**
   * ShareSheet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ShareSheet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ShareSheetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ShareSheetProps = $derived.by(() => {
    const rawProps: ShareSheetProps = stripSvelteProps(allProps);
    const result = safeParse(ShareSheetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ShareSheetProps;
  });
</script>

<div data-slot="share-sheet" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
