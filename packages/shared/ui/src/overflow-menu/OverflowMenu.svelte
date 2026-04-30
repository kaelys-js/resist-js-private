<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * OverflowMenu Svelte component — three-dots menu for
   * overflow actions. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OverflowMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for OverflowMenu. */
  export type OverflowMenuProps = v.InferOutput<typeof OverflowMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * OverflowMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OverflowMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OverflowMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OverflowMenuProps = $derived.by(() => {
    const rawProps: OverflowMenuProps = stripSvelteProps(allProps);
    const result = safeParse(OverflowMenuPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OverflowMenuProps;
  });
</script>

<div data-slot="overflow-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
