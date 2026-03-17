<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AvatarGroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AvatarGroupProps = v.InferOutput<typeof AvatarGroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * AvatarGroup — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AvatarGroup />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AvatarGroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AvatarGroupProps = $derived.by(() => {
    const rawProps: AvatarGroupProps = stripSvelteProps(allProps);
    const result = safeParse(AvatarGroupPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AvatarGroupProps;
  });
</script>

<div data-slot="avatar-group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
