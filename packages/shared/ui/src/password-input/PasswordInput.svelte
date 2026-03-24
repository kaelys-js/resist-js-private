<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PasswordInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type PasswordInputProps = v.InferOutput<typeof PasswordInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * PasswordInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PasswordInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PasswordInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PasswordInputProps = $derived.by(() => {
    const rawProps: PasswordInputProps = stripSvelteProps(allProps);
    const result = safeParse(PasswordInputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PasswordInputProps;
  });
</script>

<div data-slot="password-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
