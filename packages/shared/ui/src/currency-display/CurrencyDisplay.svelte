<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CurrencyDisplayPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CurrencyDisplayProps = v.InferOutput<typeof CurrencyDisplayPropsSchema>;
</script>

<script lang="ts">
  /**
   * CurrencyDisplay — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CurrencyDisplay />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CurrencyDisplayProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CurrencyDisplayProps = $derived.by(() => {
    const rawProps: CurrencyDisplayProps = stripSvelteProps(allProps);
    const result = safeParse(CurrencyDisplayPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CurrencyDisplayProps;
  });
</script>

<div data-slot="currency-display" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
