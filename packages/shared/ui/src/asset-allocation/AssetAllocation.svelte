<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const AssetAllocationPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type AssetAllocationProps = v.InferOutput<typeof AssetAllocationPropsSchema>;
</script>

<script lang="ts">
  /**
   * AssetAllocation — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <AssetAllocation />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = AssetAllocationProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: AssetAllocationProps = $derived.by(() => {
    const rawProps: AssetAllocationProps = stripSvelteProps(allProps);
    const result = safeParse(AssetAllocationPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as AssetAllocationProps;
  });
</script>

<div data-slot="asset-allocation" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
