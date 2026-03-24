<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SearchboxPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SearchboxProps = v.InferOutput<typeof SearchboxPropsSchema>;
</script>

<script lang="ts">
  /**
   * Searchbox — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Searchbox />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SearchboxProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SearchboxProps = $derived.by(() => {
    const rawProps: SearchboxProps = stripSvelteProps(allProps);
    const result = safeParse(SearchboxPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SearchboxProps;
  });
</script>

<div data-slot="searchbox" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
