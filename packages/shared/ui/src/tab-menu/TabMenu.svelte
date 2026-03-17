<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TabMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TabMenuProps = v.InferOutput<typeof TabMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * TabMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TabMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TabMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TabMenuProps = $derived.by(() => {
    const rawProps: TabMenuProps = stripSvelteProps(allProps);
    const result = safeParse(TabMenuPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TabMenuProps;
  });
</script>

<div data-slot="tab-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
