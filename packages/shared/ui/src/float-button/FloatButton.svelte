<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * FloatButton Svelte component — floating action button
   * (FAB) fixed to the viewport, optionally with a group of
   * related actions. Placeholder shell awaiting full
   * implementation; ships with a class prop for root-level
   * styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const FloatButtonPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for FloatButton. */
  export type FloatButtonProps = v.InferOutput<typeof FloatButtonPropsSchema>;
</script>

<script lang="ts">
  /**
   * FloatButton — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <FloatButton />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = FloatButtonProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: FloatButtonProps = $derived.by(() => {
    const rawProps: FloatButtonProps = stripSvelteProps(allProps);
    const result = safeParse(FloatButtonPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FloatButtonProps;
  });
</script>

<div data-slot="float-button" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
