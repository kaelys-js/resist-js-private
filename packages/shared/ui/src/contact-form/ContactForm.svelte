<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ContactForm — contact / inquiry submission form. Placeholder
   * shell awaiting full implementation; ships with a `class`
   * prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ContactFormPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ContactForm. */
  export type ContactFormProps = v.InferOutput<typeof ContactFormPropsSchema>;
</script>

<script lang="ts">
  /**
   * ContactForm — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ContactForm />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ContactFormProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ContactFormProps = $derived.by(() => {
    const rawProps: ContactFormProps = stripSvelteProps(allProps);
    const result = safeParse(ContactFormPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ContactFormProps;
  });
</script>

<div data-slot="contact-form" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
