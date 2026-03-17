<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NotificationListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type NotificationListProps = v.InferOutput<typeof NotificationListPropsSchema>;
</script>

<script lang="ts">
  /**
   * NotificationList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NotificationList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NotificationListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NotificationListProps = $derived.by(() => {
    const rawProps: NotificationListProps = stripSvelteProps(allProps);
    const result = safeParse(NotificationListPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NotificationListProps;
  });
</script>

<div data-slot="notification-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
