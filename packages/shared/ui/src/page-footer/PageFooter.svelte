<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PageFooterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PageFooterProps = v.InferOutput<typeof PageFooterPropsSchema>;
</script>

<script lang="ts">
  /**
   * PageFooter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PageFooter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PageFooterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PageFooterProps = $derived.by(() => {
    const rawProps: PageFooterProps = stripSvelteProps(allProps);
    const result = safeParse(PageFooterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PageFooterProps;
  });
</script>

<div data-slot="page-footer" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
