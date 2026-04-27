<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PasswordStrengthPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PasswordStrength. */
  export type PasswordStrengthProps = v.InferOutput<typeof PasswordStrengthPropsSchema>;
</script>

<script lang="ts">
  /**
   * PasswordStrength — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PasswordStrength />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PasswordStrengthProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PasswordStrengthProps = $derived.by(() => {
    const rawProps: PasswordStrengthProps = stripSvelteProps(allProps);
    const result = safeParse(PasswordStrengthPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PasswordStrengthProps;
  });
</script>

<div data-slot="password-strength" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
