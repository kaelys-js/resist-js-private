<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NotificationDot Svelte component — small notification
   * indicator dot. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NotificationDotPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NotificationDot. */
  export type NotificationDotProps = v.InferOutput<typeof NotificationDotPropsSchema>;
</script>

<script lang="ts">
  /**
   * NotificationDot — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NotificationDot />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NotificationDotProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NotificationDotProps = $derived.by(() => {
    const rawProps: NotificationDotProps = stripSvelteProps(allProps);
    const result = safeParse(NotificationDotPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NotificationDotProps;
  });
</script>

<div data-slot="notification-dot" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
