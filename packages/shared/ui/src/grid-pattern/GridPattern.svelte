<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GridPatternPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GridPattern. */
  export type GridPatternProps = v.InferOutput<typeof GridPatternPropsSchema>;
</script>

<script lang="ts">
  /**
   * GridPattern — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GridPattern />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GridPatternProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GridPatternProps = $derived.by(() => {
    const rawProps: GridPatternProps = stripSvelteProps(allProps);
    const result = safeParse(GridPatternPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GridPatternProps;
  });
</script>

<div data-slot="grid-pattern" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
