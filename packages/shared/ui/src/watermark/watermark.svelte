<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Watermark Svelte component — repeating overlay pattern
   * marking content as draft / confidential / branded.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const WatermarkPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Watermark. */
  export type WatermarkProps = v.InferOutput<typeof WatermarkPropsSchema>;
</script>

<script lang="ts">
  /**
   * Watermark — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Watermark />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = WatermarkProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: WatermarkProps = $derived.by(() => {
    const rawProps: WatermarkProps = stripSvelteProps(allProps);
    const result = safeParse(WatermarkPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as WatermarkProps;
  });
</script>

<div data-slot="watermark" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
