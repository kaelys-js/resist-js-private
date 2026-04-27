<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PrivacyNoticePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PrivacyNotice. */
  export type PrivacyNoticeProps = v.InferOutput<typeof PrivacyNoticePropsSchema>;
</script>

<script lang="ts">
  /**
   * PrivacyNotice — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PrivacyNotice />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PrivacyNoticeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PrivacyNoticeProps = $derived.by(() => {
    const rawProps: PrivacyNoticeProps = stripSvelteProps(allProps);
    const result = safeParse(PrivacyNoticePropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PrivacyNoticeProps;
  });
</script>

<div data-slot="privacy-notice" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
