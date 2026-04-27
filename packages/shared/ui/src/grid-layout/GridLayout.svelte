<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GridLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GridLayout. */
  export type GridLayoutProps = v.InferOutput<typeof GridLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * GridLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GridLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GridLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GridLayoutProps = $derived.by(() => {
    const rawProps: GridLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(GridLayoutPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GridLayoutProps;
  });
</script>

<div data-slot="grid-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
