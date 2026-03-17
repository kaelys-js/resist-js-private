<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TwoFactorAuthPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TwoFactorAuthProps = v.InferOutput<typeof TwoFactorAuthPropsSchema>;
</script>

<script lang="ts">
  /**
   * TwoFactorAuth — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TwoFactorAuth />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TwoFactorAuthProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TwoFactorAuthProps = $derived.by(() => {
    const rawProps: TwoFactorAuthProps = stripSvelteProps(allProps);
    const result = safeParse(TwoFactorAuthPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TwoFactorAuthProps;
  });
</script>

<div data-slot="two-factor-auth" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
