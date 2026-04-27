<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StickyHeaderPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StickyHeader. */
  export type StickyHeaderProps = v.InferOutput<typeof StickyHeaderPropsSchema>;
</script>

<script lang="ts">
  /**
   * StickyHeader — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StickyHeader />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StickyHeaderProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StickyHeaderProps = $derived.by(() => {
    const rawProps: StickyHeaderProps = stripSvelteProps(allProps);
    const result = safeParse(StickyHeaderPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StickyHeaderProps;
  });
</script>

<div data-slot="sticky-header" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
