<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DataViewPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DataViewProps = v.InferOutput<typeof DataViewPropsSchema>;
</script>

<script lang="ts">
  /**
   * DataView — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DataView />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DataViewProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DataViewProps = $derived.by(() => {
    const rawProps: DataViewProps = stripSvelteProps(allProps);
    const result = safeParse(DataViewPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DataViewProps;
  });
</script>

<div data-slot="data-view" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
