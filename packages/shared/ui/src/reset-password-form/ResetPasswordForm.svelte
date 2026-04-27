<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ResetPasswordFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ResetPasswordForm. */
  export type ResetPasswordFormProps = v.InferOutput<typeof ResetPasswordFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * ResetPasswordForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ResetPasswordForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ResetPasswordFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ResetPasswordFormProps = $derived.by(() => {
    const rawProps: ResetPasswordFormProps = stripSvelteProps(allProps);
    const result = safeParse(ResetPasswordFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ResetPasswordFormProps;
  });
</script>

<div data-slot="reset-password-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
