<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TabNavigationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TabNavigationProps = v.InferOutput<typeof TabNavigationPropsSchema>;
</script>

<script lang="ts">
  /**
   * TabNavigation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TabNavigation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TabNavigationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TabNavigationProps = $derived.by(() => {
    const rawProps: TabNavigationProps = stripSvelteProps(allProps);
    const result = safeParse(TabNavigationPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TabNavigationProps;
  });
</script>

<div data-slot="tab-navigation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
