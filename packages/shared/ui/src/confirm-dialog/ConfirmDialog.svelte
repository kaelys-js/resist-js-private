<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * ConfirmDialog — confirmation dialog with Confirm / Cancel
   * action buttons. Placeholder shell awaiting full
   * implementation; ships with a `class` prop for root-level
   * styling overrides.
   *
   * @module
   */

  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ConfirmDialogPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for ConfirmDialog. */
  export type ConfirmDialogProps = v.InferOutput<typeof ConfirmDialogPropsSchema>;
</script>

<script lang="ts">
  /**
   * ConfirmDialog — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ConfirmDialog />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ConfirmDialogProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ConfirmDialogProps = $derived.by(() => {
    const rawProps: ConfirmDialogProps = stripSvelteProps(allProps);
    const result = safeParse(ConfirmDialogPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ConfirmDialogProps;
  });
</script>

<div data-slot="confirm-dialog" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
