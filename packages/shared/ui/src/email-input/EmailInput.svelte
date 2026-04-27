<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EmailInputPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EmailInput. */
  export type EmailInputProps = v.InferOutput<typeof EmailInputPropsSchema>;
</script>

<script lang="ts">
  /**
   * EmailInput — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EmailInput />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EmailInputProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EmailInputProps = $derived.by(() => {
    const rawProps: EmailInputProps = stripSvelteProps(allProps);
    const result = safeParse(EmailInputPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EmailInputProps;
  });
</script>

<div data-slot="email-input" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
