<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const GdprBannerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for GdprBanner. */
  export type GdprBannerProps = v.InferOutput<typeof GdprBannerPropsSchema>;
</script>

<script lang="ts">
  /**
   * GdprBanner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <GdprBanner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = GdprBannerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: GdprBannerProps = $derived.by(() => {
    const rawProps: GdprBannerProps = stripSvelteProps(allProps);
    const result = safeParse(GdprBannerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as GdprBannerProps;
  });
</script>

<div data-slot="gdpr-banner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
