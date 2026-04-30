<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * TokenCounter Svelte component — token usage indicator
   * showing current / maximum token counts with progress fill.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TokenCounterPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TokenCounter. */
  export type TokenCounterProps = v.InferOutput<typeof TokenCounterPropsSchema>;
</script>

<script lang="ts">
  /**
   * TokenCounter — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TokenCounter />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TokenCounterProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TokenCounterProps = $derived.by(() => {
    const rawProps: TokenCounterProps = stripSvelteProps(allProps);
    const result = safeParse(TokenCounterPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TokenCounterProps;
  });
</script>

<div data-slot="token-counter" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
