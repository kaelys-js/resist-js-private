<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FontSizeAdjuster Svelte component — accessibility text
   * size control with smaller / larger buttons. Placeholder
   * shell awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FontSizeAdjusterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FontSizeAdjuster. */
  export type FontSizeAdjusterProps = v.InferOutput<typeof FontSizeAdjusterPropsSchema>;
</script>

<script lang="ts">
  /**
   * FontSizeAdjuster — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FontSizeAdjuster />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FontSizeAdjusterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FontSizeAdjusterProps = $derived.by(() => {
    const rawProps: FontSizeAdjusterProps = stripSvelteProps(allProps);
    const result = safeParse(FontSizeAdjusterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FontSizeAdjusterProps;
  });
</script>

<div data-slot="font-size-adjuster" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
