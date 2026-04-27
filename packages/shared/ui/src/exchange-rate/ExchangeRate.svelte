<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ExchangeRatePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ExchangeRate. */
  export type ExchangeRateProps = v.InferOutput<typeof ExchangeRatePropsSchema>;
</script>

<script lang="ts">
  /**
   * ExchangeRate — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ExchangeRate />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ExchangeRateProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ExchangeRateProps = $derived.by(() => {
    const rawProps: ExchangeRateProps = stripSvelteProps(allProps);
    const result = safeParse(ExchangeRatePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ExchangeRateProps;
  });
</script>

<div data-slot="exchange-rate" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
