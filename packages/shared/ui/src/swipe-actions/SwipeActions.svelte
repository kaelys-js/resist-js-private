<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SwipeActionsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SwipeActionsProps = v.InferOutput<typeof SwipeActionsPropsSchema>;
</script>

<script lang="ts">
  /**
   * SwipeActions — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SwipeActions />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SwipeActionsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SwipeActionsProps = $derived.by(() => {
    const rawProps: SwipeActionsProps = stripSvelteProps(allProps);
    const result = safeParse(SwipeActionsPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SwipeActionsProps;
  });
</script>

<div data-slot="swipe-actions" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
