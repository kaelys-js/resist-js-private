<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Spreadsheet Svelte component — editable grid of cells
   * with row/column headers and formula support. Placeholder
   * shell awaiting full implementation; ships with a class
   * prop for root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SpreadsheetPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Spreadsheet. */
  export type SpreadsheetProps = v.InferOutput<typeof SpreadsheetPropsSchema>;
</script>

<script lang="ts">
  /**
   * Spreadsheet — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Spreadsheet />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SpreadsheetProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SpreadsheetProps = $derived.by(() => {
    const rawProps: SpreadsheetProps = stripSvelteProps(allProps);
    const result = safeParse(SpreadsheetPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SpreadsheetProps;
  });
</script>

<div data-slot="spreadsheet" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
