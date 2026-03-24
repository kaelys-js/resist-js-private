<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PortfolioGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PortfolioGridProps = v.InferOutput<typeof PortfolioGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * PortfolioGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PortfolioGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PortfolioGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PortfolioGridProps = $derived.by(() => {
    const rawProps: PortfolioGridProps = stripSvelteProps(allProps);
    const result = safeParse(PortfolioGridPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PortfolioGridProps;
  });
</script>

<div data-slot="portfolio-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
