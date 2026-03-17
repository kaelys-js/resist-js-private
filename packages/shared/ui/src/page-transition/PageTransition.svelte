<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PageTransitionPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PageTransitionProps = v.InferOutput<typeof PageTransitionPropsSchema>;
</script>

<script lang="ts">
  /**
   * PageTransition — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PageTransition />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PageTransitionProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PageTransitionProps = $derived.by(() => {
    const rawProps: PageTransitionProps = stripSvelteProps(allProps);
    const result = safeParse(PageTransitionPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PageTransitionProps;
  });
</script>

<div data-slot="page-transition" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
