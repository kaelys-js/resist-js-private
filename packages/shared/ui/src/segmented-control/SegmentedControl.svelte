<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SegmentedControl Svelte component — iOS-style group of
   * exclusive options rendered as connected pills.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SegmentedControlPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SegmentedControl. */
  export type SegmentedControlProps = v.InferOutput<typeof SegmentedControlPropsSchema>;
</script>

<script lang="ts">
  /**
   * SegmentedControl — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SegmentedControl />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SegmentedControlProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SegmentedControlProps = $derived.by(() => {
    const rawProps: SegmentedControlProps = stripSvelteProps(allProps);
    const result = safeParse(SegmentedControlPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SegmentedControlProps;
  });
</script>

<div data-slot="segmented-control" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
