<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SidebarLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SidebarLayout. */
  export type SidebarLayoutProps = v.InferOutput<typeof SidebarLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * SidebarLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SidebarLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SidebarLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SidebarLayoutProps = $derived.by(() => {
    const rawProps: SidebarLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(SidebarLayoutPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SidebarLayoutProps;
  });
</script>

<div data-slot="sidebar-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
