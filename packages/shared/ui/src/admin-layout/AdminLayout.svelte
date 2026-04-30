<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * AdminLayout — sidebar-plus-header dashboard layout for admin
   * consoles. Placeholder shell awaiting full implementation;
   * ships with a `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AdminLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AdminLayout. */
  export type AdminLayoutProps = v.InferOutput<typeof AdminLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * AdminLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AdminLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AdminLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AdminLayoutProps = $derived.by(() => {
    const rawProps: AdminLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(AdminLayoutPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AdminLayoutProps;
  });
</script>

<div data-slot="admin-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
