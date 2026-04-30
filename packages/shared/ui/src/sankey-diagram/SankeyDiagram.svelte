<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SankeyDiagram Svelte component — flow / alluvial diagram
   * showing weighted transitions between categories.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SankeyDiagramPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SankeyDiagram. */
  export type SankeyDiagramProps = v.InferOutput<typeof SankeyDiagramPropsSchema>;
</script>

<script lang="ts">
  /**
   * SankeyDiagram — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SankeyDiagram />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SankeyDiagramProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SankeyDiagramProps = $derived.by(() => {
    const rawProps: SankeyDiagramProps = stripSvelteProps(allProps);
    const result = safeParse(SankeyDiagramPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SankeyDiagramProps;
  });
</script>

<div data-slot="sankey-diagram" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
