<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NetworkGraph Svelte component — network graph
   * visualization. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NetworkGraphPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NetworkGraph. */
  export type NetworkGraphProps = v.InferOutput<typeof NetworkGraphPropsSchema>;
</script>

<script lang="ts">
  /**
   * NetworkGraph — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NetworkGraph />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NetworkGraphProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NetworkGraphProps = $derived.by(() => {
    const rawProps: NetworkGraphProps = stripSvelteProps(allProps);
    const result = safeParse(NetworkGraphPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NetworkGraphProps;
  });
</script>

<div data-slot="network-graph" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
