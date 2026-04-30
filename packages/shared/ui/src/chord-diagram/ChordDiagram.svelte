<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ChordDiagram — circular flow / relationship diagram.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ChordDiagramPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ChordDiagram. */
  export type ChordDiagramProps = v.InferOutput<typeof ChordDiagramPropsSchema>;
</script>

<script lang="ts">
  /**
   * ChordDiagram — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ChordDiagram />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ChordDiagramProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ChordDiagramProps = $derived.by(() => {
    const rawProps: ChordDiagramProps = stripSvelteProps(allProps);
    const result = safeParse(ChordDiagramPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ChordDiagramProps;
  });
</script>

<div data-slot="chord-diagram" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
