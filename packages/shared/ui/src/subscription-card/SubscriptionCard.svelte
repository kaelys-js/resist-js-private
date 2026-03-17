<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SubscriptionCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type SubscriptionCardProps = v.InferOutput<typeof SubscriptionCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * SubscriptionCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <SubscriptionCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SubscriptionCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SubscriptionCardProps = $derived.by(() => {
    const rawProps: SubscriptionCardProps = stripSvelteProps(allProps);
    const result = safeParse(SubscriptionCardPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SubscriptionCardProps;
  });
</script>

<div data-slot="subscription-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
