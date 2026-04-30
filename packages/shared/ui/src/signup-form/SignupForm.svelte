<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * SignupForm Svelte component — user-registration form with
   * email + password and optional terms acceptance.
   * Placeholder shell awaiting full implementation; ships
   * with a class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SignupFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for SignupForm. */
  export type SignupFormProps = v.InferOutput<typeof SignupFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * SignupForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SignupForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SignupFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SignupFormProps = $derived.by(() => {
    const rawProps: SignupFormProps = stripSvelteProps(allProps);
    const result = safeParse(SignupFormPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SignupFormProps;
  });
</script>

<div data-slot="signup-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
