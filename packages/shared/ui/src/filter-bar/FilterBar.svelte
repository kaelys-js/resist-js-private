<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FilterBar Svelte component — composable filter chips bar
   * for narrowing list / grid views by tag, status, or facet.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FilterBarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FilterBar. */
  export type FilterBarProps = v.InferOutput<typeof FilterBarPropsSchema>;
</script>

<script lang="ts">
  /**
   * FilterBar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FilterBar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FilterBarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FilterBarProps = $derived.by(() => {
    const rawProps: FilterBarProps = stripSvelteProps(allProps);
    const result = safeParse(FilterBarPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FilterBarProps;
  });
</script>

<div data-slot="filter-bar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
