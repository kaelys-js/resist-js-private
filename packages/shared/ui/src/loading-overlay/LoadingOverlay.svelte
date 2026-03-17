<!-- @convert-to-lens -->
<script module lang="ts">
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LoadingOverlayPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  export type LoadingOverlayProps = v.InferOutput<typeof LoadingOverlayPropsSchema>;
</script>

<script lang="ts">
  /**
   * LoadingOverlay — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LoadingOverlay />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LoadingOverlayProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LoadingOverlayProps = $derived.by(() => {
    const rawProps: LoadingOverlayProps = stripSvelteProps(allProps);
    const result = safeParse(LoadingOverlayPropsSchema, rawProps);
    if (!result.ok) throw result.error;
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LoadingOverlayProps;
  });
</script>

<div data-slot="loading-overlay" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
