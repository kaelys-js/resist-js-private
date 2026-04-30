<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SegmentBuilder Svelte component — visual rule builder
   * for defining marketing audience segments. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SegmentBuilderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SegmentBuilder. */
  export type SegmentBuilderProps = v.InferOutput<typeof SegmentBuilderPropsSchema>;
</script>

<script lang="ts">
  /**
   * SegmentBuilder — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SegmentBuilder />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SegmentBuilderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SegmentBuilderProps = $derived.by(() => {
    const rawProps: SegmentBuilderProps = stripSvelteProps(allProps);
    const result = safeParse(SegmentBuilderPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SegmentBuilderProps;
  });
</script>

<div data-slot="segment-builder" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
