<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ScrollSpy Svelte component — observes the scroll position
   * to highlight the matching nav item for the current
   * section. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ScrollSpyPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ScrollSpy. */
  export type ScrollSpyProps = v.InferOutput<typeof ScrollSpyPropsSchema>;
</script>

<script lang="ts">
  /**
   * ScrollSpy — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ScrollSpy />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ScrollSpyProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ScrollSpyProps = $derived.by(() => {
    const rawProps: ScrollSpyProps = stripSvelteProps(allProps);
    const result = safeParse(ScrollSpyPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ScrollSpyProps;
  });
</script>

<div data-slot="scroll-spy" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
