<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const StatusBadgePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for StatusBadge. */
  export type StatusBadgeProps = v.InferOutput<typeof StatusBadgePropsSchema>;
</script>

<script lang="ts">
  /**
   * StatusBadge — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <StatusBadge />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = StatusBadgeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: StatusBadgeProps = $derived.by(() => {
    const rawProps: StatusBadgeProps = stripSvelteProps(allProps);
    const result = safeParse(StatusBadgePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as StatusBadgeProps;
  });
</script>

<div data-slot="status-badge" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
