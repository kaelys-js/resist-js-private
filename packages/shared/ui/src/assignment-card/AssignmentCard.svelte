<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AssignmentCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AssignmentCardProps = v.InferOutput<typeof AssignmentCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * AssignmentCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AssignmentCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AssignmentCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AssignmentCardProps = $derived.by(() => {
    const rawProps: AssignmentCardProps = stripSvelteProps(allProps);
    const result = safeParse(AssignmentCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AssignmentCardProps;
  });
</script>

<div data-slot="assignment-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
