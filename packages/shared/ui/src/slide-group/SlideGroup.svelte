<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SlideGroup Svelte component — horizontally scrollable
   * group of items with optional snap behaviour. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SlideGroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SlideGroup. */
  export type SlideGroupProps = v.InferOutput<typeof SlideGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * SlideGroup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SlideGroup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SlideGroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SlideGroupProps = $derived.by(() => {
    const rawProps: SlideGroupProps = stripSvelteProps(allProps);
    const result = safeParse(SlideGroupPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SlideGroupProps;
  });
</script>

<div data-slot="slide-group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
