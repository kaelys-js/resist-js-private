<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const TrustBadgesPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type TrustBadgesProps = v.InferOutput<typeof TrustBadgesPropsSchema>;
</script>

<script lang="ts">
  /**
   * TrustBadges — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <TrustBadges />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = TrustBadgesProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: TrustBadgesProps = $derived.by(() => {
    const rawProps: TrustBadgesProps = stripSvelteProps(allProps);
    const result = safeParse(TrustBadgesPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as TrustBadgesProps;
  });
</script>

<div data-slot="trust-badges" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
