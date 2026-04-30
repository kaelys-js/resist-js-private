<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * LoadingButton Svelte component — button with built-in
   * spinner / loading state. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const LoadingButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for LoadingButton. */
  export type LoadingButtonProps = v.InferOutput<typeof LoadingButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * LoadingButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <LoadingButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = LoadingButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: LoadingButtonProps = $derived.by(() => {
    const rawProps: LoadingButtonProps = stripSvelteProps(allProps);
    const result = safeParse(LoadingButtonPropsSchema, rawProps);

    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as LoadingButtonProps;
  });
</script>

<div data-slot="loading-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
