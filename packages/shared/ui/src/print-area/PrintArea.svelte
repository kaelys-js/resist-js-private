<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const PrintAreaPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for PrintArea. */
  export type PrintAreaProps = v.InferOutput<typeof PrintAreaPropsSchema>;
</script>

<script lang="ts">
  /**
   * PrintArea — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <PrintArea />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = PrintAreaProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: PrintAreaProps = $derived.by(() => {
    const rawProps: PrintAreaProps = stripSvelteProps(allProps);
    const result = safeParse(PrintAreaPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as PrintAreaProps;
  });
</script>

<div data-slot="print-area" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
