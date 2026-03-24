<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EmptyStatePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type EmptyStateProps = v.InferOutput<typeof EmptyStatePropsSchema>;
</script>

<script lang="ts">
  /**
   * EmptyState — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EmptyState />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EmptyStateProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EmptyStateProps = $derived.by(() => {
    const rawProps: EmptyStateProps = stripSvelteProps(allProps);
    const result = safeParse(EmptyStatePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EmptyStateProps;
  });
</script>

<div data-slot="empty-state" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
