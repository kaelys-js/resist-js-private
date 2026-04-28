<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ImpersonationBanner Svelte component — admin warning bar
   * shown when an operator is impersonating another user.
   * Placeholder shell awaiting full implementation; ships with a
   * class prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ImpersonationBannerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ImpersonationBanner. */
  export type ImpersonationBannerProps = v.InferOutput<typeof ImpersonationBannerPropsSchema>;
</script>

<script lang="ts">
  /**
   * ImpersonationBanner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ImpersonationBanner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ImpersonationBannerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ImpersonationBannerProps = $derived.by(() => {
    const rawProps: ImpersonationBannerProps = stripSvelteProps(allProps);
    const result = safeParse(ImpersonationBannerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ImpersonationBannerProps;
  });
</script>

<div data-slot="impersonation-banner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
