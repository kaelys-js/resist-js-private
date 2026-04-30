<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SocialLoginButton Svelte component — branded button
   * triggering OAuth login with a single provider (Google,
   * GitHub, etc). Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SocialLoginButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SocialLoginButton. */
  export type SocialLoginButtonProps = v.InferOutput<typeof SocialLoginButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * SocialLoginButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SocialLoginButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SocialLoginButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SocialLoginButtonProps = $derived.by(() => {
    const rawProps: SocialLoginButtonProps = stripSvelteProps(allProps);
    const result = safeParse(SocialLoginButtonPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SocialLoginButtonProps;
  });
</script>

<div data-slot="social-login-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
