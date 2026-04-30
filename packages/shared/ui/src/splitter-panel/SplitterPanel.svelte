<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SplitterPanel Svelte component — generic split-pane
   * wrapper with an interactive draggable divider.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SplitterPanelPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SplitterPanel. */
  export type SplitterPanelProps = v.InferOutput<typeof SplitterPanelPropsSchema>;
</script>

<script lang="ts">
  /**
   * SplitterPanel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SplitterPanel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SplitterPanelProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SplitterPanelProps = $derived.by(() => {
    const rawProps: SplitterPanelProps = stripSvelteProps(allProps);
    const result = safeParse(SplitterPanelPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SplitterPanelProps;
  });
</script>

<div data-slot="splitter-panel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
