<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UserListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type UserListProps = v.InferOutput<typeof UserListPropsSchema>;
</script>

<script lang="ts">
  /**
   * UserList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UserList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UserListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UserListProps = $derived.by(() => {
    const rawProps: UserListProps = stripSvelteProps(allProps);
    const result = safeParse(UserListPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UserListProps;
  });
</script>

<div data-slot="user-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
