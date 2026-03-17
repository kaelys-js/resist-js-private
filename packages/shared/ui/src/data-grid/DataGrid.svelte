<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DataGridPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DataGridProps = v.InferOutput<typeof DataGridPropsSchema>;
</script>

<script lang="ts">
  /**
   * DataGrid — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DataGrid />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DataGridProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DataGridProps = $derived.by(() => {
    const rawProps: DataGridProps = stripSvelteProps(allProps);
    const result = safeParse(DataGridPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DataGridProps;
  });
</script>

<div data-slot="data-grid" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
