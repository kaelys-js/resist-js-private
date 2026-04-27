<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EmailPreviewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EmailPreview. */
  export type EmailPreviewProps = v.InferOutput<typeof EmailPreviewPropsSchema>;
</script>

<script lang="ts">
  /**
   * EmailPreview — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EmailPreview />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EmailPreviewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EmailPreviewProps = $derived.by(() => {
    const rawProps: EmailPreviewProps = stripSvelteProps(allProps);
    const result = safeParse(EmailPreviewPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EmailPreviewProps;
  });
</script>

<div data-slot="email-preview" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
