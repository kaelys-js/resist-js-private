<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EmailTemplatePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type EmailTemplateProps = v.InferOutput<typeof EmailTemplatePropsSchema>;
</script>

<script lang="ts">
  /**
   * EmailTemplate — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EmailTemplate />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EmailTemplateProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EmailTemplateProps = $derived.by(() => {
    const rawProps: EmailTemplateProps = stripSvelteProps(allProps);
    const result = safeParse(EmailTemplatePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EmailTemplateProps;
  });
</script>

<div data-slot="email-template" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
