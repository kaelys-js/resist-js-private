<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AgeVerificationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for AgeVerification. */
  export type AgeVerificationProps = v.InferOutput<typeof AgeVerificationPropsSchema>;
</script>

<script lang="ts">
  /**
   * AgeVerification — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AgeVerification />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AgeVerificationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AgeVerificationProps = $derived.by(() => {
    const rawProps: AgeVerificationProps = stripSvelteProps(allProps);
    const result = safeParse(AgeVerificationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AgeVerificationProps;
  });
</script>

<div data-slot="age-verification" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
