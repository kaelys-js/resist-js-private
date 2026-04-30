<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * RingProgress Svelte component — circular SVG donut
   * progress indicator with optional inner label. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RingProgressPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RingProgress. */
  export type RingProgressProps = v.InferOutput<typeof RingProgressPropsSchema>;
</script>

<script lang="ts">
  /**
   * RingProgress — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RingProgress />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RingProgressProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RingProgressProps = $derived.by(() => {
    const rawProps: RingProgressProps = stripSvelteProps(allProps);
    const result = safeParse(RingProgressPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RingProgressProps;
  });
</script>

<div data-slot="ring-progress" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
