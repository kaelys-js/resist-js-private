<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GroupAvatarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type GroupAvatarProps = v.InferOutput<typeof GroupAvatarPropsSchema>;
</script>

<script lang="ts">
  /**
   * GroupAvatar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GroupAvatar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GroupAvatarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GroupAvatarProps = $derived.by(() => {
    const rawProps: GroupAvatarProps = stripSvelteProps(allProps);
    const result = safeParse(GroupAvatarPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GroupAvatarProps;
  });
</script>

<div data-slot="group-avatar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
