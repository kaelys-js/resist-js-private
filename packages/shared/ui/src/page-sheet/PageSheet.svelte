<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PageSheetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PageSheet. */
  export type PageSheetProps = v.InferOutput<typeof PageSheetPropsSchema>;
</script>

<script lang="ts">
  /**
   * PageSheet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PageSheet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PageSheetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PageSheetProps = $derived.by(() => {
    const rawProps: PageSheetProps = stripSvelteProps(allProps);
    const result = safeParse(PageSheetPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PageSheetProps;
  });
</script>

<div data-slot="page-sheet" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
