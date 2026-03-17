<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CreditCardInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CreditCardInputProps = v.InferOutput<typeof CreditCardInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * CreditCardInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CreditCardInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CreditCardInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CreditCardInputProps = $derived.by(() => {
    const rawProps: CreditCardInputProps = stripSvelteProps(allProps);
    const result = safeParse(CreditCardInputPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CreditCardInputProps;
  });
</script>

<div data-slot="credit-card-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
