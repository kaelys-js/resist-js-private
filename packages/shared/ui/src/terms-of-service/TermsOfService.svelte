<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TermsOfServicePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TermsOfServiceProps = v.InferOutput<typeof TermsOfServicePropsSchema>;
</script>

<script lang="ts">
  /**
   * TermsOfService — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TermsOfService />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TermsOfServiceProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TermsOfServiceProps = $derived.by(() => {
    const rawProps: TermsOfServiceProps = stripSvelteProps(allProps);
    const result = safeParse(TermsOfServicePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TermsOfServiceProps;
  });
</script>

<div data-slot="terms-of-service" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
