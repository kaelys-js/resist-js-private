<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * Barcode — linear barcode renderer / scanner surface.
   * Placeholder shell awaiting full implementation; ships with a
   * `class` prop for root-level styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const BarcodePropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Barcode. */
  export type BarcodeProps = v.InferOutput<typeof BarcodePropsSchema>;
</script>

<script lang="ts">
  /**
   * Barcode — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Barcode />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = BarcodeProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: BarcodeProps = $derived.by(() => {
    const rawProps: BarcodeProps = stripSvelteProps(allProps);
    const result = safeParse(BarcodePropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as BarcodeProps;
  });
</script>

<div data-slot="barcode" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
