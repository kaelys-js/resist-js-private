<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TrialBannerPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for TrialBanner. */
  export type TrialBannerProps = v.InferOutput<typeof TrialBannerPropsSchema>;
</script>

<script lang="ts">
  /**
   * TrialBanner — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TrialBanner />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TrialBannerProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TrialBannerProps = $derived.by(() => {
    const rawProps: TrialBannerProps = stripSvelteProps(allProps);
    const result = safeParse(TrialBannerPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TrialBannerProps;
  });
</script>

<div data-slot="trial-banner" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
