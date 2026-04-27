<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const RewardCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for RewardCard. */
  export type RewardCardProps = v.InferOutput<typeof RewardCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * RewardCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <RewardCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = RewardCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: RewardCardProps = $derived.by(() => {
    const rawProps: RewardCardProps = stripSvelteProps(allProps);
    const result = safeParse(RewardCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as RewardCardProps;
  });
</script>

<div data-slot="reward-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
