<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * BottomNavigation — fixed bottom-of-screen tab navigation for
   * mobile interfaces. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BottomNavigationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for BottomNavigation. */
  export type BottomNavigationProps = v.InferOutput<typeof BottomNavigationPropsSchema>;
</script>

<script lang="ts">
  /**
   * BottomNavigation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <BottomNavigation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BottomNavigationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BottomNavigationProps = $derived.by(() => {
    const rawProps: BottomNavigationProps = stripSvelteProps(allProps);
    const result = safeParse(BottomNavigationPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BottomNavigationProps;
  });
</script>

<div data-slot="bottom-navigation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
