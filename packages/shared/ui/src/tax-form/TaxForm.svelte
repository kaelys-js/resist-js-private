<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TaxFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TaxFormProps = v.InferOutput<typeof TaxFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * TaxForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TaxForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TaxFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TaxFormProps = $derived.by(() => {
    const rawProps: TaxFormProps = stripSvelteProps(allProps);
    const result = safeParse(TaxFormPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TaxFormProps;
  });
</script>

<div data-slot="tax-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
