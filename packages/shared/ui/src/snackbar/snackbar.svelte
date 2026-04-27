<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const SnackbarPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for Snackbar. */
  export type SnackbarProps = v.InferOutput<typeof SnackbarPropsSchema>;
</script>

<script lang="ts">
  /**
   * Snackbar — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Snackbar />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = SnackbarProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: SnackbarProps = $derived.by(() => {
    const rawProps: SnackbarProps = stripSvelteProps(allProps);
    const result = safeParse(SnackbarPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as SnackbarProps;
  });
</script>

<div data-slot="snackbar" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
