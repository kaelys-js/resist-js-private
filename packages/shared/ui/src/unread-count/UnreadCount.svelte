<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const UnreadCountPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type UnreadCountProps = v.InferOutput<typeof UnreadCountPropsSchema>;
</script>

<script lang="ts">
  /**
   * UnreadCount — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <UnreadCount />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = UnreadCountProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: UnreadCountProps = $derived.by(() => {
    const rawProps: UnreadCountProps = stripSvelteProps(allProps);
    const result = safeParse(UnreadCountPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as UnreadCountProps;
  });
</script>

<div data-slot="unread-count" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
