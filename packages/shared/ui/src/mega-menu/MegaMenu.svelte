<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * MegaMenu Svelte component — full-width navigation flyout
   * with multiple columns. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const MegaMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for MegaMenu. */
  export type MegaMenuProps = v.InferOutput<typeof MegaMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * MegaMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <MegaMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = MegaMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: MegaMenuProps = $derived.by(() => {
    const rawProps: MegaMenuProps = stripSvelteProps(allProps);
    const result = safeParse(MegaMenuPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as MegaMenuProps;
  });
</script>

<div data-slot="mega-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
