<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Toolbar Svelte component — container for grouped action
   * buttons, toggles, and separators. Placeholder shell
   * awaiting full implementation; ships with a class prop
   * for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ToolbarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Toolbar. */
  export type ToolbarProps = v.InferOutput<typeof ToolbarPropsSchema>;
</script>

<script lang="ts">
  /**
   * Toolbar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Toolbar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ToolbarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ToolbarProps = $derived.by(() => {
    const rawProps: ToolbarProps = stripSvelteProps(allProps);
    const result = safeParse(ToolbarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ToolbarProps;
  });
</script>

<div data-slot="toolbar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
