<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UserPresencePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type UserPresenceProps = v.InferOutput<typeof UserPresencePropsSchema>;
</script>

<script lang="ts">
  /**
   * UserPresence — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UserPresence />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UserPresenceProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UserPresenceProps = $derived.by(() => {
    const rawProps: UserPresenceProps = stripSvelteProps(allProps);
    const result = safeParse(UserPresencePropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UserPresenceProps;
  });
</script>

<div data-slot="user-presence" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
