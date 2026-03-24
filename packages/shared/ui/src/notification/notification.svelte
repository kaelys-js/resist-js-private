<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NotificationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type NotificationProps = v.InferOutput<typeof NotificationPropsSchema>;
</script>

<script lang="ts">
  /**
   * Notification — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Notification />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NotificationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NotificationProps = $derived.by(() => {
    const rawProps: NotificationProps = stripSvelteProps(allProps);
    const result = safeParse(NotificationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NotificationProps;
  });
</script>

<div data-slot="notification" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
