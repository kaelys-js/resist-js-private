<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * DragHandle — reorder grip / drag-handle indicator.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DragHandlePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for DragHandle. */
  export type DragHandleProps = v.InferOutput<typeof DragHandlePropsSchema>;
</script>

<script lang="ts">
  /**
   * DragHandle — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DragHandle />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DragHandleProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DragHandleProps = $derived.by(() => {
    const rawProps: DragHandleProps = stripSvelteProps(allProps);
    const result = safeParse(DragHandlePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DragHandleProps;
  });
</script>

<div data-slot="drag-handle" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
