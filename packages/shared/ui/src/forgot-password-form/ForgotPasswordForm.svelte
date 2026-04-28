<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ForgotPasswordForm Svelte component — password reset
   * request form with email entry. Placeholder shell awaiting
   * full implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ForgotPasswordFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ForgotPasswordForm. */
  export type ForgotPasswordFormProps = v.InferOutput<typeof ForgotPasswordFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * ForgotPasswordForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ForgotPasswordForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ForgotPasswordFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ForgotPasswordFormProps = $derived.by(() => {
    const rawProps: ForgotPasswordFormProps = stripSvelteProps(allProps);
    const result = safeParse(ForgotPasswordFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ForgotPasswordFormProps;
  });
</script>

<div data-slot="forgot-password-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
