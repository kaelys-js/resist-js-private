<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UserManagementTablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type UserManagementTableProps = v.InferOutput<typeof UserManagementTablePropsSchema>;
</script>

<script lang="ts">
  /**
   * UserManagementTable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UserManagementTable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UserManagementTableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UserManagementTableProps = $derived.by(() => {
    const rawProps: UserManagementTableProps = stripSvelteProps(allProps);
    const result = safeParse(UserManagementTablePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UserManagementTableProps;
  });
</script>

<div data-slot="user-management-table" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
