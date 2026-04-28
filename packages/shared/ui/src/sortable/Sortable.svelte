<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Sortable Svelte component — drag-to-reorder list
   * container with handle support. Placeholder shell awaiting
   * full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SortablePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Sortable. */
  export type SortableProps = v.InferOutput<typeof SortablePropsSchema>;
</script>

<script lang="ts">
  /**
   * Sortable — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Sortable />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SortableProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SortableProps = $derived.by(() => {
    const rawProps: SortableProps = stripSvelteProps(allProps);
    const result = safeParse(SortablePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SortableProps;
  });
</script>

<div data-slot="sortable" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
