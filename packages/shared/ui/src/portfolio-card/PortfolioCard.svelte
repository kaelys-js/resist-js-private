<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PortfolioCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PortfolioCardProps = v.InferOutput<typeof PortfolioCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * PortfolioCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PortfolioCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PortfolioCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PortfolioCardProps = $derived.by(() => {
    const rawProps: PortfolioCardProps = stripSvelteProps(allProps);
    const result = safeParse(PortfolioCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PortfolioCardProps;
  });
</script>

<div data-slot="portfolio-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
