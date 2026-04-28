<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Group Svelte component — inline-flex container for
   * arranging children horizontally with consistent spacing.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GroupPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Group. */
  export type GroupProps = v.InferOutput<typeof GroupPropsSchema>;
</script>

<script lang="ts">
  /**
   * Group — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Group />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GroupProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GroupProps = $derived.by(() => {
    const rawProps: GroupProps = stripSvelteProps(allProps);
    const result = safeParse(GroupPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GroupProps;
  });
</script>

<div data-slot="group" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
