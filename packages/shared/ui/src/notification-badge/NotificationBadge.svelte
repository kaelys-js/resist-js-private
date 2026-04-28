<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NotificationBadge Svelte component — count badge attached
   * to a notification icon. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NotificationBadgePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NotificationBadge. */
  export type NotificationBadgeProps = v.InferOutput<typeof NotificationBadgePropsSchema>;
</script>

<script lang="ts">
  /**
   * NotificationBadge — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NotificationBadge />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NotificationBadgeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NotificationBadgeProps = $derived.by(() => {
    const rawProps: NotificationBadgeProps = stripSvelteProps(allProps);
    const result = safeParse(NotificationBadgePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NotificationBadgeProps;
  });
</script>

<div data-slot="notification-badge" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
