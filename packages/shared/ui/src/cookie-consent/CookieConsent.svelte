<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CookieConsentPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CookieConsentProps = v.InferOutput<typeof CookieConsentPropsSchema>;
</script>

<script lang="ts">
  /**
   * CookieConsent — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CookieConsent />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CookieConsentProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CookieConsentProps = $derived.by(() => {
    const rawProps: CookieConsentProps = stripSvelteProps(allProps);
    const result = safeParse(CookieConsentPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CookieConsentProps;
  });
</script>

<div data-slot="cookie-consent" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
