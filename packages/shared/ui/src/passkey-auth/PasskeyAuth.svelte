<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * PasskeyAuth Svelte component — passkey-based
   * authentication flow. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PasskeyAuthPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PasskeyAuth. */
  export type PasskeyAuthProps = v.InferOutput<typeof PasskeyAuthPropsSchema>;
</script>

<script lang="ts">
  /**
   * PasskeyAuth — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PasskeyAuth />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PasskeyAuthProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PasskeyAuthProps = $derived.by(() => {
    const rawProps: PasskeyAuthProps = stripSvelteProps(allProps);
    const result = safeParse(PasskeyAuthPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PasskeyAuthProps;
  });
</script>

<div data-slot="passkey-auth" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
