<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Paywall Svelte component — content paywall blocker with
   * upgrade CTA. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PaywallPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Paywall. */
  export type PaywallProps = v.InferOutput<typeof PaywallPropsSchema>;
</script>

<script lang="ts">
  /**
   * Paywall — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Paywall />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PaywallProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PaywallProps = $derived.by(() => {
    const rawProps: PaywallProps = stripSvelteProps(allProps);
    const result = safeParse(PaywallPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PaywallProps;
  });
</script>

<div data-slot="paywall" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
