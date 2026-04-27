<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PriceDisplayPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PriceDisplay. */
  export type PriceDisplayProps = v.InferOutput<typeof PriceDisplayPropsSchema>;
</script>

<script lang="ts">
  /**
   * PriceDisplay — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PriceDisplay />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PriceDisplayProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PriceDisplayProps = $derived.by(() => {
    const rawProps: PriceDisplayProps = stripSvelteProps(allProps);
    const result = safeParse(PriceDisplayPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PriceDisplayProps;
  });
</script>

<div data-slot="price-display" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
