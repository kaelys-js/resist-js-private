<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const OauthButtonsPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type OauthButtonsProps = v.InferOutput<typeof OauthButtonsPropsSchema>;
</script>

<script lang="ts">
  /**
   * OauthButtons — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <OauthButtons />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = OauthButtonsProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: OauthButtonsProps = $derived.by(() => {
    const rawProps: OauthButtonsProps = stripSvelteProps(allProps);
    const result = safeParse(OauthButtonsPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as OauthButtonsProps;
  });
</script>

<div data-slot="oauth-buttons" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
