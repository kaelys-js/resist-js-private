<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SavedFiltersPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SavedFilters. */
  export type SavedFiltersProps = v.InferOutput<typeof SavedFiltersPropsSchema>;
</script>

<script lang="ts">
  /**
   * SavedFilters — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SavedFilters />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SavedFiltersProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SavedFiltersProps = $derived.by(() => {
    const rawProps: SavedFiltersProps = stripSvelteProps(allProps);
    const result = safeParse(SavedFiltersPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SavedFiltersProps;
  });
</script>

<div data-slot="saved-filters" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
