<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SignaturePadPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SignaturePadProps = v.InferOutput<typeof SignaturePadPropsSchema>;
</script>

<script lang="ts">
  /**
   * SignaturePad — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SignaturePad />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SignaturePadProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SignaturePadProps = $derived.by(() => {
    const rawProps: SignaturePadProps = stripSvelteProps(allProps);
    const result = safeParse(SignaturePadPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SignaturePadProps;
  });
</script>

<div data-slot="signature-pad" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
