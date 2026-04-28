<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PeekPreview Svelte component — pop-out content preview
   * popover. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PeekPreviewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PeekPreview. */
  export type PeekPreviewProps = v.InferOutput<typeof PeekPreviewPropsSchema>;
</script>

<script lang="ts">
  /**
   * PeekPreview — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PeekPreview />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PeekPreviewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PeekPreviewProps = $derived.by(() => {
    const rawProps: PeekPreviewProps = stripSvelteProps(allProps);
    const result = safeParse(PeekPreviewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PeekPreviewProps;
  });
</script>

<div data-slot="peek-preview" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
