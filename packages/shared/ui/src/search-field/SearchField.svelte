<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SearchFieldPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SearchFieldProps = v.InferOutput<typeof SearchFieldPropsSchema>;
</script>

<script lang="ts">
  /**
   * SearchField — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SearchField />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SearchFieldProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SearchFieldProps = $derived.by(() => {
    const rawProps: SearchFieldProps = stripSvelteProps(allProps);
    const result = safeParse(SearchFieldPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SearchFieldProps;
  });
</script>

<div data-slot="search-field" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
