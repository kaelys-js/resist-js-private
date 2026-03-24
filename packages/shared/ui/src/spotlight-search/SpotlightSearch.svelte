<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpotlightSearchPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SpotlightSearchProps = v.InferOutput<typeof SpotlightSearchPropsSchema>;
</script>

<script lang="ts">
  /**
   * SpotlightSearch — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SpotlightSearch />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpotlightSearchProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpotlightSearchProps = $derived.by(() => {
    const rawProps: SpotlightSearchProps = stripSvelteProps(allProps);
    const result = safeParse(SpotlightSearchPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpotlightSearchProps;
  });
</script>

<div data-slot="spotlight-search" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
