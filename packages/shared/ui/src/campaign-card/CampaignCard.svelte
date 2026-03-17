<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const CampaignCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type CampaignCardProps = v.InferOutput<typeof CampaignCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * CampaignCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <CampaignCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = CampaignCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: CampaignCardProps = $derived.by(() => {
    const rawProps: CampaignCardProps = stripSvelteProps(allProps);
    const result = safeParse(CampaignCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as CampaignCardProps;
  });
</script>

<div data-slot="campaign-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
