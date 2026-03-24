<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DeliveryStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DeliveryStatusProps = v.InferOutput<typeof DeliveryStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * DeliveryStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DeliveryStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DeliveryStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DeliveryStatusProps = $derived.by(() => {
    const rawProps: DeliveryStatusProps = stripSvelteProps(allProps);
    const result = safeParse(DeliveryStatusPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DeliveryStatusProps;
  });
</script>

<div data-slot="delivery-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
