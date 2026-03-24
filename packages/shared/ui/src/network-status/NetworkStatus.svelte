<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NetworkStatusPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type NetworkStatusProps = v.InferOutput<typeof NetworkStatusPropsSchema>;
</script>

<script lang="ts">
  /**
   * NetworkStatus — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NetworkStatus />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NetworkStatusProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NetworkStatusProps = $derived.by(() => {
    const rawProps: NetworkStatusProps = stripSvelteProps(allProps);
    const result = safeParse(NetworkStatusPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NetworkStatusProps;
  });
</script>

<div data-slot="network-status" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
