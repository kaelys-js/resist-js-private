<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AnchorNavigation — in-page navigation that highlights the
   * currently visible section and provides click-to-scroll anchor
   * links. Placeholder shell awaiting full implementation; ships
   * with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AnchorNavigationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AnchorNavigation. */
  export type AnchorNavigationProps = v.InferOutput<typeof AnchorNavigationPropsSchema>;
</script>

<script lang="ts">
  /**
   * AnchorNavigation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AnchorNavigation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AnchorNavigationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AnchorNavigationProps = $derived.by(() => {
    const rawProps: AnchorNavigationProps = stripSvelteProps(allProps);
    const result = safeParse(AnchorNavigationPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AnchorNavigationProps;
  });
</script>

<div data-slot="anchor-navigation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
