<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DataExportPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DataExportProps = v.InferOutput<typeof DataExportPropsSchema>;
</script>

<script lang="ts">
  /**
   * DataExport — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DataExport />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DataExportProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DataExportProps = $derived.by(() => {
    const rawProps: DataExportProps = stripSvelteProps(allProps);
    const result = safeParse(DataExportPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DataExportProps;
  });
</script>

<div data-slot="data-export" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
