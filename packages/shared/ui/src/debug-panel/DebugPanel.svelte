<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DebugPanel — collapsible developer debug panel. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DebugPanelPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DebugPanel. */
  export type DebugPanelProps = v.InferOutput<typeof DebugPanelPropsSchema>;
</script>

<script lang="ts">
  /**
   * DebugPanel — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DebugPanel />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DebugPanelProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DebugPanelProps = $derived.by(() => {
    const rawProps: DebugPanelProps = stripSvelteProps(allProps);
    const result = safeParse(DebugPanelPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DebugPanelProps;
  });
</script>

<div data-slot="debug-panel" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
