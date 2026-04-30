<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ProgressiveBlur Svelte component — animated gradient blur
   * mask applied along an edge to fade content. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ProgressiveBlurPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ProgressiveBlur. */
  export type ProgressiveBlurProps = v.InferOutput<typeof ProgressiveBlurPropsSchema>;
</script>

<script lang="ts">
  /**
   * ProgressiveBlur — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ProgressiveBlur />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ProgressiveBlurProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ProgressiveBlurProps = $derived.by(() => {
    const rawProps: ProgressiveBlurProps = stripSvelteProps(allProps);
    const result = safeParse(ProgressiveBlurPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ProgressiveBlurProps;
  });
</script>

<div data-slot="progressive-blur" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
