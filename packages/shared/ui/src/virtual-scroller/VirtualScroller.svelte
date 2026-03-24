<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const VirtualScrollerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type VirtualScrollerProps = v.InferOutput<typeof VirtualScrollerPropsSchema>;
</script>

<script lang="ts">
  /**
   * VirtualScroller — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <VirtualScroller />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = VirtualScrollerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: VirtualScrollerProps = $derived.by(() => {
    const rawProps: VirtualScrollerProps = stripSvelteProps(allProps);
    const result = safeParse(VirtualScrollerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as VirtualScrollerProps;
  });
</script>

<div data-slot="virtual-scroller" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
