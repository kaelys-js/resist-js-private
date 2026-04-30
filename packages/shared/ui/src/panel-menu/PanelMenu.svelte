<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PanelMenu Svelte component — sidebar panel-style nested
   * menu. Placeholder shell awaiting full implementation;
   * ships with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PanelMenuPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PanelMenu. */
  export type PanelMenuProps = v.InferOutput<typeof PanelMenuPropsSchema>;
</script>

<script lang="ts">
  /**
   * PanelMenu — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PanelMenu />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PanelMenuProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PanelMenuProps = $derived.by(() => {
    const rawProps: PanelMenuProps = stripSvelteProps(allProps);
    const result = safeParse(PanelMenuPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PanelMenuProps;
  });
</script>

<div data-slot="panel-menu" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
