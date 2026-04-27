<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ResponsiveGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ResponsiveGrid. */
  export type ResponsiveGridProps = v.InferOutput<typeof ResponsiveGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * ResponsiveGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ResponsiveGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ResponsiveGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ResponsiveGridProps = $derived.by(() => {
    const rawProps: ResponsiveGridProps = stripSvelteProps(allProps);
    const result = safeParse(ResponsiveGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ResponsiveGridProps;
  });
</script>

<div data-slot="responsive-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
