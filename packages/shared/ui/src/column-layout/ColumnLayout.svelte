<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ColumnLayoutPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ColumnLayout. */
  export type ColumnLayoutProps = v.InferOutput<typeof ColumnLayoutPropsSchema>;
</script>

<script lang="ts">
  /**
   * ColumnLayout — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ColumnLayout />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ColumnLayoutProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ColumnLayoutProps = $derived.by(() => {
    const rawProps: ColumnLayoutProps = stripSvelteProps(allProps);
    const result = safeParse(ColumnLayoutPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ColumnLayoutProps;
  });
</script>

<div data-slot="column-layout" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
