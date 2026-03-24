<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const DataListPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type DataListProps = v.InferOutput<typeof DataListPropsSchema>;
</script>

<script lang="ts">
  /**
   * DataList — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <DataList />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = DataListProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: DataListProps = $derived.by(() => {
    const rawProps: DataListProps = stripSvelteProps(allProps);
    const result = safeParse(DataListPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as DataListProps;
  });
</script>

<div data-slot="data-list" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
