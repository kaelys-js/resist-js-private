<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * NetworkInspector Svelte component — devtools-style
   * network request inspector. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const NetworkInspectorPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for NetworkInspector. */
  export type NetworkInspectorProps = v.InferOutput<typeof NetworkInspectorPropsSchema>;
</script>

<script lang="ts">
  /**
   * NetworkInspector — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <NetworkInspector />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = NetworkInspectorProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: NetworkInspectorProps = $derived.by(() => {
    const rawProps: NetworkInspectorProps = stripSvelteProps(allProps);
    const result = safeParse(NetworkInspectorPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as NetworkInspectorProps;
  });
</script>

<div data-slot="network-inspector" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
