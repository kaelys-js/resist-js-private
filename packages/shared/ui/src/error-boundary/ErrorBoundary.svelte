<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const ErrorBoundaryPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type ErrorBoundaryProps = v.InferOutput<typeof ErrorBoundaryPropsSchema>;
</script>

<script lang="ts">
  /**
   * ErrorBoundary — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <ErrorBoundary />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = ErrorBoundaryProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: ErrorBoundaryProps = $derived.by(() => {
    const rawProps: ErrorBoundaryProps = stripSvelteProps(allProps);
    const result = safeParse(ErrorBoundaryPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as ErrorBoundaryProps;
  });
</script>

<div data-slot="error-boundary" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
