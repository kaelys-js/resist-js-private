<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ToastPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ToastProps = v.InferOutput<typeof ToastPropsSchema>;
</script>

<script lang="ts">
  /**
   * Toast — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <Toast />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ToastProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ToastProps = $derived.by(() => {
    const rawProps: ToastProps = stripSvelteProps(allProps);
    const result = safeParse(ToastPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ToastProps;
  });
</script>

<div data-slot="toast" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
