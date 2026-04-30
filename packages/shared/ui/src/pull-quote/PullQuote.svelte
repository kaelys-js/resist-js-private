<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PullQuote Svelte component — featured callout block
   * displaying an article quote at large type for emphasis.
   * Placeholder shell awaiting full implementation; ships with
   * a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PullQuotePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PullQuote. */
  export type PullQuoteProps = v.InferOutput<typeof PullQuotePropsSchema>;
</script>

<script lang="ts">
  /**
   * PullQuote — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PullQuote />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PullQuoteProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PullQuoteProps = $derived.by(() => {
    const rawProps: PullQuoteProps = stripSvelteProps(allProps);
    const result = safeParse(PullQuotePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PullQuoteProps;
  });
</script>

<div data-slot="pull-quote" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
