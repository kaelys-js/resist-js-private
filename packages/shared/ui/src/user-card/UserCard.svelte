<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UserCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for UserCard. */
  export type UserCardProps = v.InferOutput<typeof UserCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * UserCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UserCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UserCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UserCardProps = $derived.by(() => {
    const rawProps: UserCardProps = stripSvelteProps(allProps);
    const result = safeParse(UserCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UserCardProps;
  });
</script>

<div data-slot="user-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
