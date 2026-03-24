<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CaptchaPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CaptchaProps = v.InferOutput<typeof CaptchaPropsSchema>;
</script>

<script lang="ts">
  /**
   * Captcha — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Captcha />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CaptchaProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CaptchaProps = $derived.by(() => {
    const rawProps: CaptchaProps = stripSvelteProps(allProps);
    const result = safeParse(CaptchaPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CaptchaProps;
  });
</script>

<div data-slot="captcha" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
