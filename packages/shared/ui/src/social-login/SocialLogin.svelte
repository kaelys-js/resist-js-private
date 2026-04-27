<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SocialLoginPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SocialLogin. */
  export type SocialLoginProps = v.InferOutput<typeof SocialLoginPropsSchema>;
</script>

<script lang="ts">
  /**
   * SocialLogin — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SocialLogin />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SocialLoginProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SocialLoginProps = $derived.by(() => {
    const rawProps: SocialLoginProps = stripSvelteProps(allProps);
    const result = safeParse(SocialLoginPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SocialLoginProps;
  });
</script>

<div data-slot="social-login" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
